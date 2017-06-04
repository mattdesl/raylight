const chalk = require('chalk');
const assign = require('object-assign');
const budo = require('budo');
const bodyParser = require('body-parser');
const defined = require('defined');
const uuid = require('uuid/v1')
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const minimist = require('minimist');
const padLeft = require('pad-left');
const downloadsFolder = require('downloads-folder');

module.exports = dev
function dev (args, argv) {
  const cwd = process.cwd();

  let printOutputFolder;
  let isDownloads = false;
  if (argv.output) {
    printOutputFolder = argv.output;
  } else {
    isDownloads = true;
    printOutputFolder = downloadsFolder();
  }

  const isSequence = false;

  const opts = assign({}, argv, {
    live: true,
    dir: path.resolve(__dirname, 'app'),
    browserify: {
      transform: [ 'babelify', 'glslify' ]
    },
    middleware: [
      bodyParser.json({
        limit: '1gb'
      }),
      middleware
    ],
    serve: 'bundle.js'
  });
  const app = budo.cli(args, opts);
  return app;

  function middleware (req, res, next) {
    if (req.url === '/save') {
      getFile('png', req, file => png(file, req, res));
    } else {
      next();
    }
  }

  function composeFile (name, extension, number) {
    return (number === 0 ? name : `${name} (${number})`) + `.${extension}`;
  }

  function getFile (extension, req, cb) {
    if (isSequence && req.body && typeof req.body.frame === 'number') {
      const curFrame = req.body.frame;
      const totalFrameDigits = Math.max(4, String(defined(req.body.totalFrames, 1000)).length);
      const name = padLeft(String(curFrame), totalFrameDigits, '0');
      return process.nextTick(function () {
        cb(path.resolve(printOutputFolder, `${name}.${extension}`));
      });
    }
    fs.readdir(printOutputFolder, (err, files) => {
      if (err) {
        console.error(chalk.yellow(`‣ WARN`), 'Could not read folder:', chalk.bold(printOutputFolder));
        console.error(err);
        cb(path.resolve(printOutputFolder, uuid() + `.${extension}`));
      } else {
        const type = extension === 'svg' ? 'Plot' : 'Render';
        const date = moment().format('YYYY-MM-DD [at] h.mm.ss A');
        let name = `${type} - ${date}`;
        let number = 0;
        while (true) {
          let test = composeFile(name, extension, number);
          if (files.indexOf(test) >= 0) {
            // file already exists
            number++;
          } else {
            break;
          }
        }
        const fileName = composeFile(name, extension, number);
        cb(path.resolve(printOutputFolder, fileName));
      }
    });
  }

  function getDisplayPath (filePath) {
    return isDownloads ? filePath : path.relative(cwd, filePath);
  }

  function png (filePath, req, res) {
    if (!req.body || !req.body.data) {
      res.writeHead(400, 'missing base64 data for save function');
      res.end;
    }
    const data = Buffer.from(req.body.data, 'base64');
    fs.writeFile(filePath, data, function (err) {
      if (err) {
        console.error(err);
        res.writeHead(400, err.message);
        return res.end();
      }
      console.log(chalk.cyan(`‣ Saved PNG canvas to:`), chalk.bold(getDisplayPath(filePath)));
      res.writeHead(200, 'ok');
      res.end();
    });
  }
}

if (!module.parent) {
  const args = process.argv.slice(2);
  dev(args, minimist(args));
}