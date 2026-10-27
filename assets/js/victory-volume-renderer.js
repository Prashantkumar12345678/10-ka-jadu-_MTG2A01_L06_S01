/* One continuous, shaded 3D craft and rider. No pose atlas is sampled while turning. */
window.createVictoryVolumeSprite=function(color){
  const canvas=document.createElement('canvas');canvas.width=750;canvas.height=690;
  canvas.className='victory-hero victory-angles';canvas.dataset.boatColor=color;
  canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Swifty और जेट स्की का लगातार घूमता हुआ 3D दृश्य');
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:true});
  if(!gl)return window.createVictoryTurnSprite(color);
  let dead=false,lastHeading=null,count=0,faceTexture=null;const resources=[],data=[];
  const rgb=h=>h.match(/\w\w/g).map(v=>parseInt(v,16)/255);
  const paint=rgb(({blue:'1189f8',red:'fa303b',yellow:'ffcb17',green:'36d52b'})[color]||'1189f8');
  const white=rgb('fff9e9'),ink=rgb('233c51'),gold=rgb('ffc72c'),orange=rgb('ffa917'),navy=rgb('102e48');
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const normal=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
  const tri=(a,b,c,tint,ns,material=0)=>{
    const u=b.map((v,i)=>v-a[i]),v=c.map((q,i)=>q-a[i]),n=normal(cross(u,v));
    if(ns&&n.reduce((s,q,i)=>s+q*ns[0][i],0)<0){[b,c]=[c,b];[ns[1],ns[2]]=[ns[2],ns[1]];}
    [a,b,c].forEach((p,i)=>data.push(...p,...(ns?ns[i]:n),...tint,material));
  };
  const sphere=(p,size,tint,tilt=0,segments=24,rows=16,material=0)=>{
    const point=(i,j)=>{
      const a=i/rows*Math.PI,b=j/segments*2*Math.PI,n=[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];
      const q=n.map((x,k)=>x*size[k]),c=Math.cos(tilt),s=Math.sin(tilt),nn=normal(n.map((x,k)=>x/size[k]));
      return {p:[p[0]+q[0]*c-q[1]*s,p[1]+q[0]*s+q[1]*c,p[2]+q[2]],n:[nn[0]*c-nn[1]*s,nn[0]*s+nn[1]*c,nn[2]]};
    };
    for(let i=0;i<rows;i++)for(let j=0;j<segments;j++){
      const a=point(i,j),b=point(i+1,j),c=point(i+1,j+1),d=point(i,j+1);
      tri(a.p,b.p,c.p,tint,[a.n,b.n,c.n],material);tri(a.p,c.p,d.p,tint,[a.n,c.n,d.n],material);
    }
  };
  const tube=(points,radius,tint,segments=16)=>{
    const ring=(i,j)=>{
      const p=points[i],before=points[Math.max(0,i-1)],after=points[Math.min(points.length-1,i+1)],w=normal(after.map((x,k)=>x-before[k]));
      const u=normal(cross(w,Math.abs(w[1])<.9?[0,1,0]:[1,0,0])),v=cross(w,u),a=j/segments*Math.PI*2;
      const n=u.map((x,k)=>x*Math.cos(a)+v[k]*Math.sin(a));return {p:p.map((x,k)=>x+n[k]*radius),n};
    };
    for(let i=0;i<points.length-1;i++)for(let j=0;j<segments;j++){
      const a=ring(i,j),b=ring(i+1,j),c=ring(i+1,j+1),d=ring(i,j+1);
      tri(a.p,b.p,c.p,tint,[a.n,b.n,c.n]);tri(a.p,c.p,d.p,tint,[a.n,c.n,d.n]);
    }
    for(const p of [points[0],points[points.length-1]])sphere(p,[radius,radius,radius],tint,0,16,10);
  };
  const feather=(base,tip,width,depth,tint)=>{
    const rings=14,segments=20;
    const point=(i,j)=>{
      const t=i/rings,a=j/segments*Math.PI*2,r=Math.pow(Math.sin(Math.PI*t),.8),center=base.map((x,k)=>x+(tip[k]-x)*t);
      center[0]+=.07*Math.sin(Math.PI*t);const p=[center[0]+width*r*Math.cos(a),center[1],center[2]+depth*r*Math.sin(a)];
      return {p,n:normal([Math.cos(a),t>.8?.7:0,Math.sin(a)])};
    };
    for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){
      const a=point(i,j),b=point(i+1,j),c=point(i+1,j+1),d=point(i,j+1);
      tri(a.p,b.p,c.p,tint,[a.n,b.n,c.n]);tri(a.p,c.p,d.p,tint,[a.n,c.n,d.n]);
    }
  };
  const stations=[[-1.55,.49],[-1.3,.76],[-.85,.94],[-.25,.99],[.4,.91],[.95,.72],[1.4,.61],[1.7,.40]];
  const hullWidth=z=>{
    let i=0;while(i<stations.length-2&&z>stations[i+1][0])i++;
    const t=Math.max(0,Math.min(1,(z-stations[i][0])/(stations[i+1][0]-stations[i][0])));
    const a=stations[Math.max(0,i-1)][1],b=stations[i][1],c=stations[i+1][1],d=stations[Math.min(stations.length-1,i+2)][1];
    return 1.25*.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
  };
  const hullPoint=(z,a)=>[hullWidth(z)*Math.cos(a),.21+.35*Math.sin(a),z];
  const hullNormal=(z,a)=>{
    const e=.001,p=hullPoint(z,a),q=hullPoint(Math.min(1.7,z+e),a),r=hullPoint(z,a+e);
    let n=normal(cross(q.map((v,i)=>v-p[i]),r.map((v,i)=>v-p[i])));
    if(n[0]*Math.cos(a)+n[1]*Math.sin(a)<0)n=n.map(x=>-x);return n;
  };
  const decal=(points,project,tint,n)=>{
    const steps=10;
    for(let t=1;t<points.length-1;t++){
      const a=points[0],b=points[t],c=points[t+1];
      const p=(u,v)=>project([a[0]+(b[0]-a[0])*u/steps+(c[0]-a[0])*v/steps,a[1]+(b[1]-a[1])*u/steps+(c[1]-a[1])*v/steps]);
      for(let u=0;u<steps;u++)for(let v=0;v<steps-u;v++){
        tri(p(u,v),p(u+1,v),p(u,v+1),tint,[n,n,n]);
        if(u+v<steps-1)tri(p(u+1,v),p(u+1,v+1),p(u,v+1),tint,[n,n,n]);
      }
    }
  };
  const build=()=>{
    // A broad rounded sporty hull, with a thick white bumper and navy underbody.
    const segments=80,rings=64;
    for(let i=0;i<segments;i++)for(let j=0;j<rings;j++){
      const z=-1.55+i/segments*3.25,zz=-1.55+(i+1)/segments*3.25,a=j/rings*Math.PI*2,b=(j+1)/rings*Math.PI*2;
      const p=hullPoint(z,a),q=hullPoint(zz,a),r=hullPoint(zz,b),s=hullPoint(z,b),y=(p[1]+q[1]+r[1]+s[1])/4;
      const tint=y<.23?navy:y<.315?white:paint;
      tri(p,q,r,tint,[hullNormal(z,a),hullNormal(zz,a),hullNormal(zz,b)],1);tri(p,r,s,tint,[hullNormal(z,a),hullNormal(zz,b),hullNormal(z,b)],1);
    }
    sphere([0,.21,-1.52],[.61,.35,.06],navy);
    for(let i=0;i<12;i++)for(let j=0;j<64;j++){
      const point=(u,v)=>{const a=u/12*Math.PI/2,b=v/64*Math.PI*2;return [Math.cos(a)*.50*Math.cos(b),.21+Math.cos(a)*.35*Math.sin(b),1.7+Math.sin(a)*.16];};
      const p=point(i,j),q=point(i+1,j),r=point(i+1,j+1),t=point(i,j+1),yy=(p[1]+q[1]+r[1]+t[1])/4;
      const ns=[p,q,r,t].map(v=>normal([v[0]/.25,(v[1]-.21)/.1225,(v[2]-1.7)/.0256]));
      const tint=yy<.23?navy:yy<.315?white:paint;tri(p,q,r,tint,[ns[0],ns[1],ns[2]],1);tri(p,r,t,tint,[ns[0],ns[2],ns[3]],1);
    }
    for(const side of [-1,1])for(let i=0;i<9;i++){
      const z=-1.15+i*.25,x=side*(hullWidth(z)+.055),cyan=rgb('55dcff');
      sphere([x,-.075,z],[.11,.024,.17],cyan,0,14,8,2);
      sphere([x-side*.025,-.05,z+.035],[.07,.028,.105],white,0,12,8,2);
    }
    sphere([0,.60,-.57],[.42,.14,.77],navy);
    const consoleRings=[[.55,.57,.37,.35],[.75,.49,.31,.29],[.97,.35,.21,.18],[1.0,.35,.05,.05]];
    for(let k=0;k<consoleRings.length-1;k++)for(let j=0;j<32;j++){
      const ring=(i,a)=>{const [y,z,xr,zr]=consoleRings[i];return [xr*Math.cos(a),y,z+zr*Math.sin(a)];};
      const a=j/32*Math.PI*2,b=(j+1)/32*Math.PI*2,p=ring(k,a),q=ring(k+1,a),r=ring(k+1,b),u=ring(k,b);
      const n=normal([Math.cos((a+b)/2),.15,Math.sin((a+b)/2)]),tint=Math.sin((a+b)/2)>.1?navy:paint;
      tri(p,q,r,tint,[n,n,n]);tri(p,r,u,tint,[n,n,n]);
    }
    // White V on the hood and matching painted cockpit rails.
    for(const side of [-1,1]){
      const vPoints=[[side*.52,.32],[side*.42,.32],[side*.24,1.05],[0,1.5],[side*.37,1.03]];
      decal(vPoints,([x,z])=>[x,.21+.35*Math.sqrt(Math.max(0,1-Math.pow(x/hullWidth(z),2)))+.014,z],white,[0,1,0]);
      tube([[side*.55,.54,-1.3],[side*.55,.72,-1.15],[side*.46,.73,-.86]],.07,paint);
      const shape=[[-.96,.46],[-.45,.40],[-.63,.38],[-.02,.27],[-.34,.39],[-.16,.41]];
      const bolt=color==='yellow'?rgb('ff9e0b'):gold;
      decal(shape,([z,y])=>[side*(hullWidth(z)*Math.sqrt(Math.max(0,1-Math.pow((y-.21)/.35,2)))+.014),y,z],bolt,[side,.2,0]);
    }
    sphere([0,.28,-1.59],[.28,.12,.035],ink);sphere([0,.28,-1.62],[.21,.075,.02],rgb('061b2a'));
    tube([[0,.83,.55],[0,1.12,.58]],.065,navy);
    tube([[-.64,1.12,.58],[.64,1.12,.58]],.068,navy);
    tube([[-.29,1.12,.58],[.29,1.12,.58]],.088,paint);
    // Seated shorts, bent legs, webbed feet and naturally bent hoodie sleeves.
    sphere([0,.91,-.39],[.35,.28,.37],rgb('167bcc'));
    for(const side of [-1,1]){
      tube([[side*.24,.88,-.36],[side*.44,.65,.03]],.145,rgb('167bcc'));
      sphere([side*.44,.53,.27],[.18,.075,.28],orange);
      for(let toe=0;toe<3;toe++)sphere([side*.44+(toe-1)*.095,.52,.46],[.07,.055,.13],orange);
    }
    sphere([0,1.23,-.25],[.43,.45,.34],gold);
    sphere([0,1.60,-.32],[.47,.16,.38],rgb('efaa19'));
    sphere([0,1.66,-.28],[.36,.12,.29],rgb('ffe07a'));
    tube([[0,.89,.09],[0,1.51,.11]],.015,rgb('d68b12'));
    for(const side of [-1,1]){
      tube([[side*.31,1.47,-.13],[side*.47,1.29,.13],[side*.51,1.15,.55]],.135,gold);
      tube([[side*.12,1.55,.08],[side*.14,1.28,.13]],.015,white);
      sphere([side*.51,1.15,.59],[.145,.115,.135],white);
      for(let finger=0;finger<3;finger++)tube([[side*.51+(finger-1)*.06,1.10,.69],[side*.51+(finger-1)*.06,1.18,.70]],.009,rgb('c7c0aa'),10);
    }
    // Satchel, curved strap and jacket smile badge.
    sphere([.46,1.00,-.47],[.24,.27,.15],rgb('9a5d2b'),-.18);
    sphere([.47,1.10,-.37],[.22,.13,.045],rgb('b77736'),-.18);
    sphere([.49,1.02,-.319],[.035,.035,.012],gold);
    tube([[-.29,1.58,.04],[-.12,1.36,.10],[.10,1.12,.12],[.39,.86,-.03]],.043,rgb('97602d'));
    const badge=[];for(let i=0;i<=32;i++){const a=i/32*Math.PI*2;badge.push([-.19+.09*Math.cos(a),1.27+.09*Math.sin(a),.083]);}tube(badge,.012,rgb('ad771f'),10);
    sphere([-.22,1.30,.095],[.009,.014,.008],ink);sphere([-.16,1.30,.095],[.009,.014,.008],ink);
    tube([[-.23,1.25,.095],[-.19,1.22,.105],[-.15,1.25,.095]],.008,ink,10);
    // Soft feathered cheeks and a pointed tuft reproduce the mascot silhouette.
    sphere([0,2.07,-.21],[.55,.61,.49],white);
    for(const side of [-1,1]){
      sphere([side*.46,1.90,-.01],[.10,.095,.13],white,side*.15);

    }
    feather([-.13,2.54,-.26],[.08,2.89,-.30],.085,.09,white);
    feather([.04,2.56,-.25],[.20,2.80,-.28],.07,.075,white);
    feather([-.23,2.52,-.29],[-.09,2.75,-.29],.06,.07,white);
    // Large blue eyes, glints, brows and a genuinely open smiling orange bill.
    sphere([0,1.91,.334],[.25,.08,.23],orange);
    sphere([0,1.79,.416],[.18,.11,.06],rgb('7e3025'));
    sphere([0,1.71,.423],[.20,.035,.10],orange);
    sphere([0,1.745,.472],[.105,.033,.012],rgb('fa6a6d'));
    sphere([-.075,1.94,.574],[.014,.009,.006],rgb('d87c13'));sphere([.075,1.94,.574],[.014,.009,.006],rgb('d87c13'));
  };
  const shader=(type,source)=>{const s=gl.createShader(type);resources.push(['Shader',s]);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const program=gl.createProgram();resources.push(['Program',program]);
  gl.attachShader(program,shader(gl.VERTEX_SHADER,`
    attribute vec3 p,n,c;attribute float k;uniform mat4 vp;uniform float yaw,outline;varying vec3 color,normal,world,objectP;varying float material;
    void main(){float a=cos(yaw),b=sin(yaw);mat3 r=mat3(a,0.,-b,0.,1.,0.,b,0.,a);
    color=c;material=k;objectP=p;normal=r*n;world=r*(p+n*outline*.010*(1.-step(1.5,k)));gl_Position=vp*vec4(world,1.);}`));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`
    precision highp float;varying vec3 color,normal,world,objectP;varying float material;uniform float outline;uniform sampler2D face;uniform vec3 paint;
    void main(){if(outline>.5){if(material>1.5)discard;gl_FragColor=vec4(.10,.19,.25,1.);return;}
      vec3 n=normalize(normal),l=normalize(vec3(-.5,1.,.9)),eye=normalize(vec3(0.,2.7,7.)-world);
      float diffuse=max(0.,dot(n,l));float light=.66+.34*smoothstep(-.1,.85,diffuse);
      float shine=pow(max(0.,dot(n,normalize(l+eye))),45.);
      vec3 base=color;
      if(material>.5&&material<1.5){
        vec3 navy=vec3(.063,.18,.28),white=vec3(1.,.98,.92);
        base=mix(navy,white,smoothstep(.226,.234,objectP.y));base=mix(base,paint,smoothstep(.311,.319,objectP.y));
      }
      if(objectP.y>1.78&&objectP.y<2.60&&objectP.z>.10&&color.r>.85&&color.g>.85){
        vec2 uv=vec2(.5+objectP.x/1.1,(2.83-objectP.y)/1.22);
        vec4 art=texture2D(face,vec2((1050.+uv.x*120.)/1254.,(20.+uv.y*100.)/1254.));
        if(uv.x>.10&&uv.x<.90&&uv.y>.10&&uv.y<.75&&art.b>=art.r*.9&&min(art.r,min(art.g,art.b))<.8)base=art.rgb;
      }
      gl_FragColor=vec4(base*light+vec3(.9,.96,1.)*shine*.12,1.);
    }`));
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);const U={};['vp','yaw','outline'].forEach(k=>U[k]=gl.getUniformLocation(program,k));
  const buffer=gl.createBuffer();resources.push(['Buffer',buffer]);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  ['p','n','c'].forEach((name,i)=>{const a=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,40,i*12);});const kind=gl.getAttribLocation(program,'k');gl.enableVertexAttribArray(kind);gl.vertexAttribPointer(kind,1,gl.FLOAT,false,40,36);gl.uniform3fv(gl.getUniformLocation(program,'paint'),paint);
  const ready=new Promise((resolve,reject)=>{
    const image=new Image();image.onerror=reject;image.onload=()=>{
      if(dead){resolve();return;}
      faceTexture=gl.createTexture();resources.push(['Texture',faceTexture]);gl.bindTexture(gl.TEXTURE_2D,faceTexture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.uniform1i(gl.getUniformLocation(program,'face'),0);
      setTimeout(()=>{if(dead){resolve();return;}build();gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);count=data.length/10;data.length=0;canvas.dataset.renderer='continuous-3d-mesh';canvas.dataset.triangles=String(count/3);canvas.dataset.frameCount='continuous';resolve();},0);
    };image.src='assets/jet/swifty_turn_angles_v1.png';
  });
  const multiply=(a,b)=>{const r=new Float32Array(16);for(let c=0;c<4;c++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)r[c*4+row]+=a[k*4+row]*b[c*4+k];return r;};
  const eye=[0,2.9,8.6],target=[0,1.45,0],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const z=normal(eye.map((v,i)=>v-target[i])),x=normal(cross([0,1,0],z)),y=cross(z,x);
  const view=new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
  const f=1/Math.tan(28*Math.PI/360),near=.1,far=100;
  const projection=new Float32Array([f/(canvas.width/canvas.height),0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]),vp=multiply(projection,view);
  return {canvas,ready,draw(heading){
    if(dead||!count||heading===lastHeading)return;lastHeading=heading;gl.useProgram(program);
    gl.viewport(0,0,canvas.width,canvas.height);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,faceTexture);gl.uniformMatrix4fv(U.vp,false,vp);gl.uniform1f(U.yaw,-(heading-180)*Math.PI/180);
    gl.cullFace(gl.FRONT);gl.uniform1f(U.outline,1);gl.drawArrays(gl.TRIANGLES,0,count);
    gl.cullFace(gl.BACK);gl.uniform1f(U.outline,0);gl.drawArrays(gl.TRIANGLES,0,count);
    canvas.dataset.heading=heading.toFixed(3);canvas.dataset.yaw=String(-(heading-180));
  },dispose(){if(dead)return;dead=true;resources.forEach(([type,value])=>gl['delete'+type](value));gl.getExtension('WEBGL_lose_context')?.loseContext();}};
};
