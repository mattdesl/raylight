/**
 * @author alteredq / http://alteredqualia.com/
 */

const Pass = require('./Pass');

module.exports = RenderPass;
function RenderPass ( scene, camera, overrideMaterial, clearColor, clearAlpha ) {

  Pass.call( this );

  this.scene = scene;
  this.camera = camera;

  this.overrideMaterial = overrideMaterial;

  this.clearColor = clearColor;
  this.clearAlpha = ( clearAlpha !== undefined ) ? clearAlpha : 0;

  this.gammaInput = undefined;
  this.gammaOutput = undefined;
  this.clear = true;
  this.needsSwap = false;

}

RenderPass.prototype = Object.assign( Object.create( Pass.prototype ), {

  constructor: RenderPass,

  render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {

    var oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    var oldGammaInput = renderer.gammaInput;
    var oldGammaOutput = renderer.gammaOutput;
    
    if ( typeof this.gammaInput === 'boolean' ) {

      renderer.gammaInput = this.gammaInput;

    }

    if ( typeof this.gammaOutput === 'boolean' ) {

      renderer.gammaOutput = this.gammaOutput;

    }

    this.scene.overrideMaterial = this.overrideMaterial;

    var oldClearColor, oldClearAlpha;

    if ( this.clearColor ) {

      oldClearColor = renderer.getClearColor().getHex();
      oldClearAlpha = renderer.getClearAlpha();

      renderer.setClearColor( this.clearColor, this.clearAlpha );

    }

    renderer.render( this.scene, this.camera, this.renderToScreen ? null : readBuffer, this.clear );

    if ( this.clearColor ) {

      renderer.setClearColor( oldClearColor, oldClearAlpha );

    }

    this.scene.overrideMaterial = null;
    renderer.autoClear = oldAutoClear;
    renderer.gammaInput = oldGammaInput;
    renderer.gammaOutput = oldGammaOutput;
  }

} );
