/* Continuous image-space interpolation; the character remains the illustrated Swifty. */
window.createVictoryTurnSprite = function (color) {
  const W=500,H=460,KEYS=24,FW=96,FH=88,GW=33,GH=31;
  const canvas=document.createElement('canvas');
  canvas.className='victory-hero victory-angles';canvas.width=W;canvas.height=H;
  canvas.dataset.boatColor=color;
  canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Swifty की जेट स्की का लगातार घूमता हुआ साइड व्यू');
  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true,preserveDrawingBuffer:true});
  const resources=[],images=[],forward=[],backward=[],silhouettes=[];
  let disposed=false,lastHeading=null,program,quad,uniforms,ctx;
  if(gl){
    const shader=(type,source)=>{
      const s=gl.createShader(type);resources.push(['Shader',s]);gl.shaderSource(s,source);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;
    };
    program=gl.createProgram();resources.push(['Program',program]);
    gl.attachShader(program,shader(gl.VERTEX_SHADER,`attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}`));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`
      precision highp float;
      varying vec2 uv;
      uniform sampler2D imageA,imageB,flowA,flowB,shapeA,shapeB;
      uniform float blend;
      vec2 motion(sampler2D field,vec2 p){
        vec2 aligned=p*vec2(32./33.,30./31.)+vec2(.5/33.,.5/31.);
        return (texture2D(field,aligned).rg*255.-128.)/4./vec2(96.,88.);
      }
      void main(){
        vec2 a=uv,b=uv;
        a=uv-motion(flowA,a)*blend;
        a=uv-motion(flowA,a)*blend;
        b=uv-motion(flowB,b)*(1.-blend);
        b=uv-motion(flowB,b)*(1.-blend);
        vec4 mixed=mix(texture2D(imageA,a),texture2D(imageB,b),blend);
        float distance=mix(texture2D(shapeA,a).r,texture2D(shapeB,b).r,blend)*255.-128.;
        float solid=smoothstep(-2.2,2.2,distance);
        float alpha=mix(mixed.a,solid,4.*blend*(1.-blend));
        gl_FragColor=vec4(mixed.rgb/max(mixed.a,.001)*alpha,alpha);
      }`));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);quad=gl.createBuffer();resources.push(['Buffer',quad]);gl.bindBuffer(gl.ARRAY_BUFFER,quad);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const pos=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
    uniforms={blend:gl.getUniformLocation(program,'blend')};
    ['imageA','imageB','flowA','flowB','shapeA','shapeB'].forEach((name,i)=>gl.uniform1i(gl.getUniformLocation(program,name),i));
    gl.viewport(0,0,W,H);gl.clearColor(0,0,0,0);gl.disable(gl.BLEND);
  }else{ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';}

  const upload=(source,width,height)=>{
    const texture=gl.createTexture();resources.push(['Texture',texture]);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!width);
    if(width)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,source);
    else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
    return texture;
  };
  const feature=frame=>{
    const c=document.createElement('canvas');c.width=FW;c.height=FH;
    const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(frame,0,0,FW,FH);
    const rgba=g.getImageData(0,0,FW,FH).data,groups={},points={};
    const add=(name,x,y,weight)=>{const q=groups[name]||(groups[name]=[0,0,0,weight]);q[0]+=x;q[1]+=y;q[2]++;};
    for(let y=0;y<FH;y++)for(let x=0;x<FW;x++){
      const k=(y*FW+x)*4,r=rgba[k],green=rgba[k+1],b=rgba[k+2];if(rgba[k+3]<120)continue;
      const yy=y/FH,white=r>170&&green>170&&b>150;
      if(white&&yy<.4)add('head',x,y,2);
      if(yy<.38&&b>r*1.12&&b>green*.95&&b>60)add('eyes',x,y,6);
      if(yy<.43&&r>160&&green>50&&green<190&&b<100)add('beak',x,y,5);
      if(yy>.33&&yy<.67&&r>160&&green>100&&b<95)add('jacket',x,y,1);
      if(yy>.35&&yy<.65&&white)add(x<FW/2?'handLeft':'handRight',x,y,3);
      if(yy>.3&&yy<.75&&r>75&&r<190&&green>35&&green<130&&b<100&&r>green*1.2)add('bag',x,y,1);
    }
    Object.entries(groups).forEach(([name,q])=>{if(q[2]>3)points[name]=[q[0]/q[2],q[1]/q[2],q[3]];});
    // Hull and feather contours are landmarks as well, with smooth motion between rows.
    for(const yy of [.13,.25,.39,.52,.65,.78,.9,.95]){
      const y=Math.round(yy*(FH-1));let left=FW,right=0;
      for(let dy=-2;dy<=2;dy++)for(let x=0;x<FW;x++){
        const row=Math.max(0,Math.min(FH-1,y+dy));
        if(rgba[(row*FW+x)*4+3]>100){left=Math.min(left,x);right=Math.max(right,x);}
      }
      if(left<right){points['left'+yy]=[left,y,.7];points['right'+yy]=[right,y,.7];}
    }
    const distance=inside=>{
      const d=new Float32Array(FW*FH);
      for(let i=0;i<d.length;i++)d[i]=((rgba[i*4+3]>128)===inside)?0:1e6;
      for(let y=0;y<FH;y++)for(let x=0;x<FW;x++){
        const i=y*FW+x;
        if(x)d[i]=Math.min(d[i],d[i-1]+1);
        if(y)d[i]=Math.min(d[i],d[i-FW]+1);
        if(x&&y)d[i]=Math.min(d[i],d[i-FW-1]+1.414);
        if(x<FW-1&&y)d[i]=Math.min(d[i],d[i-FW+1]+1.414);
      }
      for(let y=FH-1;y>=0;y--)for(let x=FW-1;x>=0;x--){
        const i=y*FW+x;
        if(x<FW-1)d[i]=Math.min(d[i],d[i+1]+1);
        if(y<FH-1)d[i]=Math.min(d[i],d[i+FW]+1);
        if(x<FW-1&&y<FH-1)d[i]=Math.min(d[i],d[i+FW+1]+1.414);
        if(x&&y<FH-1)d[i]=Math.min(d[i],d[i+FW-1]+1.414);
      }
      return d;
    };
    const toInside=distance(true),toOutside=distance(false),shape=new Uint8Array(FW*FH*4);
    for(let i=0;i<FW*FH;i++){
      shape[i*4]=Math.max(0,Math.min(255,Math.round(128+(toOutside[i]-toInside[i])*8)));
      shape[i*4+3]=255;
    }
    return {points,shape};
  };
  const estimate=(a,b)=>{
    const anchors=[];
    Object.entries(a).forEach(([name,p])=>{const q=b[name];if(q)anchors.push([p[0],p[1],q[0]-p[0],q[1]-p[1],p[2]]);});
    [[0,0],[FW,0],[0,FH],[FW,FH],[FW/2,FH]].forEach(([x,y])=>anchors.push([x,y,0,0,.18]));
    const packed=new Uint8Array(GW*GH*4);
    for(let gy=0;gy<GH;gy++)for(let gx=0;gx<GW;gx++){
      const x=gx/(GW-1)*(FW-1),y=gy/(GH-1)*(FH-1);let sx=0,sy=0,sum=0;
      for(const [px,py,dx,dy,strength]of anchors){
        const d=(x-px)*(x-px)+(y-py)*(y-py)+9,weight=strength/(d*d);
        sx+=dx*weight;sy+=dy*weight;sum+=weight;
      }
      const i=(gy*GW+gx)*4;
      packed[i]=Math.max(0,Math.min(255,Math.round(128+sx/sum*4)));
      packed[i+1]=Math.max(0,Math.min(255,Math.round(128+sy/sum*4)));
      packed[i+2]=128;packed[i+3]=255;
    }
    return packed;
  };
  const ready=new Promise((resolve,reject)=>{
    const atlas=new Image();atlas.onload=()=>resolve(atlas);atlas.onerror=reject;atlas.src=`assets/jet/swifty_turn_${color}_v2.png`;
  }).then(async atlas=>{
    if(disposed)return;
    const features=[],cw=atlas.width/6,ch=atlas.height/4;
    const raw=document.createElement('canvas');raw.width=Math.ceil(cw);raw.height=Math.ceil(ch);
    const rg=raw.getContext('2d',{willReadFrequently:true});
    for(let i=0;i<KEYS;i++){
      rg.clearRect(0,0,raw.width,raw.height);rg.drawImage(atlas,i%6*cw,Math.floor(i/6)*ch,cw,ch,0,0,raw.width,raw.height);
      const pixels=rg.getImageData(0,0,raw.width,raw.height);let l=raw.width,r=0,t=raw.height,b=0;
      for(let y=0;y<raw.height;y++)for(let x=0;x<raw.width;x++){
        const k=(y*raw.width+x)*4;if(pixels.data[k+3]<24)pixels.data[k+3]=0;
        if(pixels.data[k+3]>96){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
      }
      rg.putImageData(pixels,0,0);
      const frame=document.createElement('canvas');frame.width=W;frame.height=H;
      const g=frame.getContext('2d');g.imageSmoothingQuality='high';
      const sx=Math.max(0,l-2),sy=Math.max(0,t-2),sw=Math.min(raw.width,r+3)-sx,sh=Math.min(raw.height,b+3)-sy;
      const height=400,width=Math.min(W-16,sw/sh*height);
      g.drawImage(raw,sx,sy,sw,sh,(W-width)/2,35,width,height);
      images.push(gl?upload(frame):frame);if(gl){const f=feature(frame);features.push(f.points);silhouettes.push(upload(f.shape,FW,FH));}
    }
    if(gl)for(let i=0;i<KEYS;i++){
      if(disposed)return;
      forward.push(upload(estimate(features[i],features[(i+1)%KEYS]),GW,GH));
      backward.push(upload(estimate(features[(i+1)%KEYS],features[i]),GW,GH));
      // Keep the countdown / questions responsive while motion fields prepare.
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    canvas.dataset.keyPoseCount=String(KEYS);canvas.dataset.frameCount='continuous';
    canvas.dataset.renderer=gl?'motion-interpolation':'canvas';
  });
  return {canvas,ready,draw(heading){
    if(disposed||images.length!==KEYS||heading===lastHeading)return;
    lastHeading=heading;
    // Heading 270 is left-facing. The atlas's left-facing view is 270, not 90.
    const direction=(((180-heading)%360)+360)%360/15,index=Math.floor(direction),blend=direction-index,next=(index+1)%KEYS;
    if(gl){
      gl.useProgram(program);[images[index],images[next],forward[index],backward[index],silhouettes[index],silhouettes[next]].forEach((texture,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,texture);});
      gl.uniform1f(uniforms.blend,blend);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }else{
      ctx.clearRect(0,0,W,H);ctx.globalAlpha=1-blend;ctx.drawImage(images[index],0,0);
      ctx.globalCompositeOperation='lighter';ctx.globalAlpha=blend;ctx.drawImage(images[next],0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    }
    canvas.dataset.direction=String(Math.round(direction*4)%96);canvas.dataset.keyPose=String(Math.round(direction)%KEYS);
    canvas.dataset.heading=heading.toFixed(2);canvas.dataset.angleBlend=blend.toFixed(4);
  },dispose(){
    if(disposed)return;disposed=true;
    if(gl){resources.forEach(([type,value])=>gl['delete'+type](value));gl.getExtension('WEBGL_lose_context')?.loseContext();}
  }};
};
