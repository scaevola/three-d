uniform mat4 viewProjection;
uniform mat4 viewProjectionInverse;
uniform vec3 cameraPosition;
uniform vec2 screenSize;

uniform samplerCube environmentMap;
uniform sampler2D depthMap;
uniform sampler2D colorMap;
uniform float metallic;
uniform float roughness;

in vec3 pos;
in vec3 nor;
in vec2 uvs;

layout (location = 0) out vec4 outColor;

const float Eta = 1. / 1.5; // Ratio of indices of refraction
const float FresnelPower = 5.0;
const float F = ((1.0-Eta) * (1.0-Eta)) / ((1.0+Eta) * (1.0+Eta));

vec3 reflect_color(vec3 incidentDir, vec3 normal)
{
    vec3 reflectDir = normalize(reflect(incidentDir, normal));
    vec3 stepDir = 0.5 * reflectDir;
    vec3 p_w = pos;
    for (int i = 0; i < 8; i++)
    {
        p_w += stepDir;
        vec4 p_s = viewProjection * vec4(p_w, 1.);
        p_s /= p_s.w;
        vec2 uv = 0.5 + 0.5 * p_s.xy;
        if(uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.)
            break;
        float dist = distance(cameraPosition, p_w);

        float d = texture(depthMap, uv).x;
        vec3 pos = world_pos_from_depth(viewProjectionInverse, d, uv);
        float depth = distance(cameraPosition, pos);
        if(depth < dist)
        {
            return inverse_reinhard_tone_mapping(rgb_from_srgb(texture(colorMap, uv).xyz));
        }
    }
    return texture(environmentMap, reflectDir).xyz;
}

vec3 water(vec3 col, vec3 p1, vec3 p2)
{
    const vec3 scattering = vec3(0.2, 0.4, 0.2); // Scattering coefficient (due to particles in the water)
    const vec3 absorption = vec3(0.4, 0.955, 0.99); // Absorption coefficient
    const vec3 c = scattering * absorption;
    const vec3 equilibriumColorAtInfinity = vec3(0., 0.1, 0.14); // Water color at "infinity"
    
    float dist = min(distance(p1, p2), 100.);
    vec3 colorChange = vec3(clamp( pow(c.r, dist), 0., 1.), clamp( pow(c.g, dist), 0., 1.), clamp( pow(c.b, dist), 0., 1.));
    return colorChange * col + (1. - colorChange) * equilibriumColorAtInfinity;
}

void main()
{
    vec2 screen_uv = gl_FragCoord.xy/screenSize;
    
    vec3 normal = normalize(nor);
    vec3 incidentDir = normalize(pos - cameraPosition);
    screen_uv -= 0.05 * normal.xz; // Shift the water bottom/sky.
    float depth = texture(depthMap, screen_uv).x;
    vec3 backgroundPos = world_pos_from_depth(viewProjectionInverse, depth, screen_uv);
    outColor.rgb = inverse_reinhard_tone_mapping(rgb_from_srgb(texture(colorMap, screen_uv).xyz));
    
    // Compute cosine to the incident angle
    float cosAngle = dot(normal, -incidentDir);
    
    // Compute fresnel approximation
    float fresnel = mix(F, 1.f, pow(1. - max(cosAngle, 0.), FresnelPower));
    
    // Reflection
    vec3 reflectColor = reflect_color(incidentDir, normal);
    
    // Refraction
    vec3 refractColor = water(outColor.rgb, pos, backgroundPos);
    
    // Mix refraction and reflection
    outColor.rgb = mix(refractColor, reflectColor, fresnel);

    outColor.rgb = calculate_lighting(cameraPosition, outColor.rgb, pos, normal, metallic, roughness, 1.0);
    outColor.rgb = reinhard_tone_mapping(outColor.rgb);
    outColor.rgb = srgb_from_rgb(outColor.rgb);
    outColor.a = 1.0;
    
}
