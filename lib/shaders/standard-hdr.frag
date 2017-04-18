#define PHYSICAL

uniform vec3 fogLightColor;
uniform vec3 fogLightPosition;
uniform mat4 cameraMatrixWorld;
uniform float fogLightStrength;
uniform float emissiveFactor;

uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;

#ifndef STANDARD
  uniform float clearCoat;
  uniform float clearCoatRoughness;
#endif

varying vec3 vViewPosition;
varying vec3 vFogWorldPosition;

#ifndef FLAT_SHADED

  varying vec3 vNormal;

#endif

#include <common>
#include <packing>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <cube_uv_reflection_fragment>
#include <lights_pars>
#include <lights_physical_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

#pragma glslify: encodePixel = require('./encode-pixel');

#pragma glslify: InScatter = require('./inscatter');

void main2() {

  #include <clipping_planes_fragment>

  vec4 diffuseColor = vec4( diffuse * emissiveFactor, opacity );
  ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
  vec3 totalEmissiveRadiance = emissive;

  #include <logdepthbuf_fragment>
  #include <map_fragment>
  #include <color_fragment>
  #include <alphamap_fragment>
  #include <alphatest_fragment>
  #include <specularmap_fragment>
  #include <roughnessmap_fragment>
  #include <metalnessmap_fragment>
  #include <normal_flip>
  #include <normal_fragment>
  #include <emissivemap_fragment>

  // accumulation
  #include <lights_physical_fragment>
  #include <lights_template>

  // modulation
  #include <aomap_fragment>

  //direction from camera
  #if (NUM_POINT_LIGHTS > 0)
    vec3 positionToCamera = vFogWorldPosition - cameraPosition;
    float positionToCameraLength = length(positionToCamera);
    // normalize
    positionToCamera = normalize(positionToCamera);

    PointLight curPointLight;
    vec3 lightPos;
    float scatter;
    vec3 fogAmt;
    for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
      curPointLight = pointLights[ i ];
      
      lightPos = (cameraMatrixWorld * vec4(curPointLight.position, 1.0)).xyz;
      scatter = InScatter(cameraPosition, positionToCamera, lightPos, positionToCameraLength);
      fogAmt = curPointLight.color * scatter * fogLightStrength;
      reflectedLight.directDiffuse += fogAmt;
    }
  #endif

  vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

  gl_FragColor = vec4( outgoingLight, diffuseColor.a );

  #include <premultiplied_alpha_fragment>
  #include <tonemapping_fragment>
  #include <encodings_fragment>
  #include <fog_fragment>

  gl_FragColor = encodePixel(gl_FragColor.r);
}


void main () {
  main2();
  // gl_FragColor = vec4(diffuse, opacity);
}