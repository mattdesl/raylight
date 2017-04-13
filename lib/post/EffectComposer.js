/**
 * @author alteredq / http://alteredqualia.com/
 */

module.exports = EffectComposer;

var CopyShader = EffectComposer.CopyShader = require('three-copyshader')
  , RenderPass = EffectComposer.RenderPass = require('three-effectcomposer/lib/renderpass')(THREE)
  , ShaderPass = EffectComposer.ShaderPass = require('./ShaderPass')(THREE, EffectComposer)
  , MaskPass = EffectComposer.MaskPass = require('three-effectcomposer/lib/maskpass')(THREE)
  , ClearMaskPass = EffectComposer.ClearMaskPass = require('three-effectcomposer/lib/clearmaskpass')(THREE)

function EffectComposer( renderer, renderTarget1, renderTarget2, initialRenderTarget ) {
  this.renderer = renderer;

  if ( renderTarget1 === undefined ) {
    throw new Error('must specify targets');
  }

  this.renderTarget1 = renderTarget1;
  this.renderTarget2 = renderTarget2;
  this.initialRenderTarget = initialRenderTarget;

  this.writeBuffer = this.renderTarget1;
  this.readBuffer = this.renderTarget2;

  this.passes = [];

  this.copyPass = new ShaderPass( CopyShader );
};

EffectComposer.prototype = {
  swapBuffers: function() {

    var tmp = this.readBuffer;
    this.readBuffer = this.writeBuffer;
    this.writeBuffer = tmp;

  },

  addPass: function ( pass ) {

    this.passes.push( pass );

  },

  clearPasses: function () {
    this.passes.length = 0;
  },

  insertPass: function ( pass, index ) {

    this.passes.splice( index, 0, pass );
    this.initialClearColor = new THREE.Color(1, 0, 0);
  },

  render: function ( delta ) {
    // 1st - write into DEPTH FBO
    // 2nd - read from DEPTH FBO, write into TMP1 FBO
    // 3rd - read from TMP1 FBO, write into TMP2 FBO
    // 4th - ping-pong TMP1/TMP2

    var useInitial = Boolean(this.initialRenderTarget);
    // assumes first pass is a render pass which writes to readBuffer
    this.writeBuffer = this.renderTarget1;
    this.readBuffer = this.renderTarget2;

    var maskActive = false;

    var pass, i, passIndex, il = this.passes.length;

    for ( i = 0, passIndex = 0; i < il; i ++ ) {

      pass = this.passes[ i ];

      if ( !pass.enabled ) {
        continue;
      }

      if (useInitial) {
        if (passIndex <= 1) {
          this.readBuffer = this.initialRenderTarget;
          this.writeBuffer = this.renderTarget1;
        } else if (passIndex === 2) {
          this.readBuffer = this.renderTarget1;
          this.writeBuffer = this.renderTarget2;
        }
      }
      
      var readTarget = this.readBuffer;
      var writeTarget = this.writeBuffer;

      var depthTexture;
      if (this.depthTexture) {
        depthTexture = this.depthTexture;
      } else if (this.initialRenderTarget) {
        depthTexture = passIndex === 0 
        ? undefined
        : this.initialRenderTarget.depthTexture;
      }
      var attachments = this.initialRenderTarget ? this.initialRenderTarget.attachments : undefined;
      pass.render( this.renderer, writeTarget, readTarget, delta, maskActive, depthTexture, attachments );

      if ( pass.needsSwap ) {

        if ( maskActive ) {

          var context = this.renderer.context;

          context.stencilFunc( context.NOTEQUAL, 1, 0xffffffff );

          this.copyPass.render( this.renderer, this.writeBuffer, this.readBuffer, delta );

          context.stencilFunc( context.EQUAL, 1, 0xffffffff );

        }

        this.swapBuffers();

      }

      if ( pass instanceof MaskPass ) {

        maskActive = true;

      } else if ( pass instanceof ClearMaskPass ) {

        maskActive = false;

      }

      passIndex++;
    }

  },

  reset: function ( renderTarget ) {

    if ( renderTarget === undefined ) {

      renderTarget = this.renderTarget1.clone();

      renderTarget.width = window.innerWidth;
      renderTarget.height = window.innerHeight;

    }

    this.renderTarget1 = renderTarget;
    this.renderTarget2 = renderTarget.clone();

    this.writeBuffer = this.renderTarget1;
    this.readBuffer = this.renderTarget2;

  },

  setSize: function ( width, height ) {

    var renderTarget = this.renderTarget1.clone();

    renderTarget.width = width;
    renderTarget.height = height;

    this.reset( renderTarget );

  }

};

// shared ortho camera

EffectComposer.camera = new THREE.OrthographicCamera( -1, 1, 1, -1, 0, 1 );

EffectComposer.quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), null );

EffectComposer.scene = new THREE.Scene();
EffectComposer.scene.add( EffectComposer.quad );
