const palettes = require('nice-color-palettes/500').slice(101, 200);
const colorStyle = require('color-style');

palettes.map((palette, i) => {
  const container = document.createElement('div');
  Object.assign(container.style, {
    padding: '0px 5px',
    lineHeight: '0px',
    display: 'inline-block'
  });
  container.addEventListener('click', () => {
    console.log(i, palette)
  })
  palette.forEach(color => {
    const div = document.createElement('div');
    Object.assign(div.style, {
      display: 'inline-block',
      width: '10px',
      height: '10px',
      background: colorStyle(color)
    });
    container.appendChild(div);
  });
  document.body.appendChild(container);
});
