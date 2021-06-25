#define MAX_MARCHING_STEPS 128
#define EPSILON .0001

Hit world(vec3 p){
  	Hit res = Hit(max(plane(p, UP, 0.), -distance(max(abs(p.x), abs(p.z)), 1.23) + .77), mat3(1.));
    mat3 m = rz(fbm1x(1.1, iTime) * 2.);
    vec3 mp = p * m;
    res = opMin(res, Hit(max(plane(mp, UP, 0.), distance(max(abs(mp.x), abs(mp.z)), 1.74) - .25), m));
    m = rz(fbm1x(1.2, iTime - .1) * 2.);
    mp = p * m;
    res = opMin(res, Hit(max(plane(mp, UP, 0.), distance(max(abs(mp.x), abs(mp.z)), 1.23) - .25), m));
    m = rz(fbm1x(1.3, iTime - .2) * 2.);
    mp = p * m;
    res = opMin(res, Hit(max(plane(mp, UP, 0.), distance(max(abs(mp.x), abs(mp.z)),  .72) - .25), m));
    return res;
}

Hit march(vec3 eye, vec3 marchingDirection, float start, float end){
    float t = start;
    for(int i=0; i<MAX_MARCHING_STEPS; i++){
	    Hit h = world( eye + marchingDirection * t );
        if( h.dist < EPSILON ) return Hit(t, h.mat);
        t += h.dist;
        if ( t >= end)
			return Hit(-end, mat3(0.));
    }
    return Hit(-1., mat3(0.));
}

vec3 estimateNormal(vec3 p) {
    return normalize(vec3(
        world(vec3(p.x + EPSILON, p.y, p.z)).dist - world(vec3(p.x - EPSILON, p.y, p.z)).dist,
        world(vec3(p.x, p.y + EPSILON, p.z)).dist - world(vec3(p.x, p.y - EPSILON, p.z)).dist,
        world(vec3(p.x, p.y, p.z  + EPSILON)).dist - world(vec3(p.x, p.y, p.z - EPSILON)).dist
    ));
}

float shadow( vec3 v, vec3 light ) {
	vec3 lv = v - light;
	float end = length( lv );
	lv /= end;
	float depth = abs(march( light, lv, 0.0, end ).dist);
	return step( end - depth, 0.03 );
}

const int   ao_iterations = 10;
const float ao_step = 0.1;
const float ao_scale = .8;
float ao( vec3 v, vec3 n ) {
	float sum = 0.0;
	float att = 1.0;
	float len = ao_step;
	for ( int i = 0; i < ao_iterations; i++ ) {
		sum += ( len - world( v + n * len ).dist ) * att;
		len += ao_step;
		att *= 0.5;
	}
	return max( 1.0 - sum * ao_scale, 0.0 );
}

const vec3 GREEN = vec3(54., 245., 142.)/255.;
const vec3 GREY = vec3(163., 167., 171.)/255.;
vec3 shading( vec3 v, vec3 n, vec3 eye, mat3 m ) {
    vec3 albedo = mix(GREEN, GREY, step(.5, dot(abs(n * m), UP)));
	vec3 final = albedo;
	
	vec3 ev = normalize( v - eye );
	vec3 ref_ev = reflect( ev, n );
	
	// light 0
	{
		vec3 light_pos   = vec3( 10.0 );
	
		vec3 vl = normalize( light_pos - v );
	
		float diffuse  = max( 0.0, dot( vl, n ) );
		float specular = max( 0.0, dot( vl, ref_ev ) );
		specular = pow( specular, 12.0 );
		
		final *= (.2 + diffuse + specular * .25) * shadow( v, light_pos ); 
	}
	
	// light 1
	{
		vec3 light_pos   = vec3( 5., 5., -5. );
	
		vec3 vl = normalize( light_pos - v );
	
		float diffuse  = max( 0.0, dot( vl, n ) );
		float specular = max( 0.0, dot( vl, ref_ev ) );
		specular = pow( specular, 64.0 );
		
		final += vec3( 0.1 ) * ( diffuse * 0.4 + specular * 0.9 ); 
	}

	final *= ao(v, n);
	
	return final;
}

vec3 render(in vec2 fragCoord){
	vec3 color = vec3(0.);
    float a = (iMouse.x/iResolution.x) * PI;
    vec3 eye = vec3(5. * sin(a), 3., 5. * cos(a)) * 1.3;
    vec3 viewDir = rayDirection(60., iResolution.xy, fragCoord);
    vec3 worldDir = viewMatrix(eye, vec3(0., -.5, 0.), vec3(0., 1., 0.)) * viewDir;
	
    Hit h = march(eye, worldDir, 0., 1000.);
    if (h.dist >= 0.) {
        vec3 p = (eye + h.dist * worldDir);
    	vec3 norm = estimateNormal(p);
        color = shading(p, norm, eye, h.mat);
    }
    return color;
}

#define AA 2
void mainImage(out vec4 fragColor, in vec2 fragCoord ){
    fragColor -= fragColor;
    for(int y = 0; y < AA; ++y)
        for(int x = 0; x < AA; ++x)
            fragColor.rgb += clamp(render(fragCoord + vec2(x, y) / float(AA)), 0., 1.);
    fragColor.rgb /= float(AA * AA);
}
