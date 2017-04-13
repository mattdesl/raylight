void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
  vec2 uv = fragCoord.xy / iResolution.xy;
  float PI = 3.14;

  
    fragColor = vec4(vec3(0.0), 1.0);
    const int count = 6;
    float alpha = 0.85;
    float maxLuma = 0.15;
    for (int i = 0; i < count; i++) {
        float angleStep = PI / min(7.0, float(i) + 4.0);

        vec2 cUv = uv - 0.5;
        cUv.x *= iResolution.x / iResolution.y;

        float angle = atan(cUv.y, cUv.x);
        angle = abs(mod(angle, angleStep * 2.0) - angleStep);
        angle -= iGlobalTime * 0.2;

        float radius = length(cUv);
        uv.x = (radius * cos(angle)) + 0.5;
        uv.y = (radius * sin(angle)) + 0.5;

        vec3 rgb = texture(iChannel0, uv).rgb / float(count);
        float L = dot(rgb, vec3(0.299, 0.587, 0.114));
    fragColor.rgb += smoothstep(maxLuma / float(count), 0.0, L) * alpha;
        
    }
    float L2 = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
    fragColor.rgb = mix(fragColor.rgb, vec3(1.0, 0.5, 2.0), L2);
    
}