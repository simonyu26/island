/* 我的家 五條線外觀（HOUSE3_v1，美術顧問樣稿 11/9 定樣，工程顧問規格）
   這個檔由 我的家外觀_HOUSE3_開發中/build_home3d.py 從 美術審查/各街房子/ 的樣稿零件產生，不要手改。
   只在家選了風格時才載入（island3d.js buildHome）。 */
(function () {
  const BLANK = new THREE.MeshBasicMaterial();
  function mk(geo, mat) { const o = new THREE.Mesh(geo, BLANK); o.userData.c = mat && mat.c != null ? mat.c : 0xffffff; return o; }
// ---- home3.js ----
// 我的家 樹狀升級 樣稿零件
const C={plaster:0xf3ead9,wood:0x8a5a3c,dark:0x3b2f2a,tileG:0x5d6066,brick:0xb5533c,redTile:0xc8452d,white:0xfbf7f0,stone:0xa59d92,deck:0xa9774f,sea:0x6fb3d2,blue:0x8fc4dc,green:0x4f7a3e,gold:0xd9a03a,noren:0x2b4a6f,plum:0x741b47};
const M={};function m(c){return M[c]||(M[c]={c:c});}
function B(g,w,h,d,c,x,y,z,ry){const b=mk(new THREE.BoxGeometry(w,h,d),m(c));b.position.set(x,y,z);if(ry)b.rotation.y=ry;g.add(b);return b;}
function Cy(g,rt,rb,h,c,x,y,z,seg){const b=mk(new THREE.CylinderGeometry(rt,rb,h,seg||8),m(c));b.position.set(x,y,z);g.add(b);return b;}
function gableR(g,w,d,h,c,x,y,z,ry){const sh=new THREE.Shape();sh.moveTo(-d/2,0);sh.lineTo(d/2,0);sh.lineTo(0,h);sh.lineTo(-d/2,0);const ge=new THREE.ExtrudeGeometry(sh,{depth:w,bevelEnabled:false});ge.translate(0,0,-w/2);ge.rotateY(Math.PI/2);const r=mk(ge,m(c));r.position.set(x,y,z);if(ry)r.rotation.y=ry;g.add(r);return r;}
function hipR(g,w,d,h,c,x,y,z){const k=mk(new THREE.ConeGeometry(Math.SQRT1_2,1,4,1),m(c));k.rotation.y=Math.PI/4;k.scale.set(w,h,d);k.position.set(x,y+h/2,z);g.add(k);return k;}
function noren(g,x,y,z,w,c){for(let i=0;i<3;i++)B(g,w/3-.015,w*.55,.012,c||C.noren,x-w/3+i*w/3,y,z);}
function lattice(g,x,y,z,w,h,n){for(let i=0;i<n;i++)B(g,.03,h,.02,C.dark,x-w/2+(i+.5)*w/n,y,z);}
function win(g,x,y,z,w,h,c){B(g,w,h,.02,c||C.blue,x,y,z);}
// --- Lv1 海邊小屋 ---
function lv1(g){B(g,1.0,.6,.8,C.plaster,0,.3,0);gableR(g,1.15,1.05,.42,C.wood,0,.6,0);B(g,.24,.42,.02,C.dark,0,.21,.41);noren(g,0,.36,.425,.32);
  B(g,1.2,.06,.3,C.deck,0,.03,.6);}
// --- 和風 ---
function wa4(g){B(g,1.5,.55,.95,C.plaster,0,.37,0);B(g,1.52,.1,.97,C.dark,0,.05,0);hipR(g,1.95,1.35,.5,C.tileG,0,.64,0);
  B(g,1.7,.08,.32,C.deck,0,.12,.62);for(let i=0;i<4;i++)win(g,-.54+i*.36,.38,.48,.3,.34,0xfdfaf2);lattice(g,0,.38,.49,1.42,.34,12);}
function wa7(g){B(g,1.1,.62,.95,C.plaster,0,.31,0);B(g,1.12,.1,.97,C.dark,0,.05,0);lattice(g,-.18,.33,.48,.6,.42,9);B(g,.26,.46,.02,C.dark,.34,.23,.48);noren(g,.34,.4,.495,.34);
  gableR(g,1.3,.32,.1,C.tileG,0,.62,.45);B(g,1.0,.38,.85,C.plaster,0,.85,0);B(g,.6,.08,.02,C.dark,0,.88,.43);gableR(g,1.3,1.15,.42,C.tileG,0,1.04,0,Math.PI/2);}
function wa10(g){wa4(g);B(g,.9,.5,.7,C.plaster,-1.15,.3,-.25);hipR(g,1.15,.95,.38,C.tileG,-1.15,.55,-.25);
  Cy(g,.36,.36,.03,C.sea,.95,.02,1.0,14);for(let i=0;i<4;i++)Cy(g,.07,.08,.06,C.stone,.62+i*.12,.03,1.32-i*.08,6);
  Cy(g,.04,.06,.22,C.stone,1.55,.11,.45,6);B(g,.14,.1,.14,C.stone,1.55,.27,.45);hipR(g,.2,.2,.08,C.stone,1.55,.32,.45);
  Cy(g,.05,.06,.3,C.wood,-.4,.15,1.1,6);hipR(g,.5,.4,.22,C.green,-.4,.28,1.1);hipR(g,.38,.32,.18,C.green,-.4,.42,1.1);
  for(let i=0;i<7;i++)B(g,.04,.2,.04,C.wood,-1.5+i*.5,.1,1.5);B(g,3.0,.03,.03,C.wood,0,.17,1.5);}
function chashitsu(g,x,z){B(g,.5,.38,.5,C.plaster,x,.19,z);hipR(g,.75,.75,.34,0xb89a5f,x,.36,z);B(g,.16,.16,.02,C.dark,x,.1,z+.26);Cy(g,.03,.04,.14,C.stone,x+.38,.07,z+.2,6);}
function sento(g,x,z){B(g,.62,.44,.5,C.plaster,x,.22,z);gableR(g,.75,.68,.26,C.tileG,x,.44,z);Cy(g,.06,.07,.7,0x8a8580,x+.2,.6,z-.15,8);noren(g,x,.3,z+.26,.3,C.plum);}
// --- 台灣 ---
function tw4(g){B(g,1.4,.62,.9,C.brick,0,.31,0);gableR(g,1.55,1.15,.42,C.redTile,0,.62,0);B(g,.28,.44,.02,C.wood,0,.22,.46);win(g,-.42,.38,.46,.26,.22,0x9fc6dd);win(g,.42,.38,.46,.26,.22,0x9fc6dd);
  for(let k of [-1,1])B(g,.08,.08,.08,C.redTile,k*.78,1.04,0);}
function tw7(g){B(g,1.1,1.1,.95,C.white,0,.55,-.05);B(g,1.1,.08,.4,C.white,0,.56,.4);for(let k of[-1,0,1])B(g,.1,.52,.1,C.white,k*.48,.26,.56);
  B(g,.3,.4,.02,C.wood,0,.2,.43);for(let k of[-1,1])win(g,k*.28,.86,.43,.24,.3,0x9fc6dd);B(g,1.16,.14,1.0,0xe3d7c3,0,1.15,-.05);
  B(g,.5,.12,.02,C.redTile,0,.72,.61);}
function tw10(g){B(g,1.4,.62,.8,C.brick,0,.31,-.6);gableR(g,1.55,1.05,.45,C.redTile,0,.62,-.6);
  for(let k of[-1,1]){B(g,.7,.52,1.0,C.brick,k*1.05,.26,.35);gableR(g,1.15,.85,.36,C.redTile,k*1.05,.52,.35,Math.PI/2);B(g,.08,.08,.08,C.redTile,k*.78,1.12,-.6);}
  B(g,1.4,.02,1.1,0xd9c7a6,0,.01,.4);B(g,.3,.44,.02,C.wood,0,.22,-.19);for(let k of[-1,1])win(g,k*.42,.38,-.19,.24,.2,0x9fc6dd);}
function kamaa(g,x,z){B(g,.6,.48,.5,C.white,x,.24,z);B(g,.66,.04,.2,0xc8452d,x,.46,z+.33);B(g,.66,.04,.2,C.white,x,.42,z+.33);B(g,.4,.12,.02,C.redTile,x,.56,z+.26);B(g,.62,.06,.52,0xe3d7c3,x,.51,z);B(g,.3,.12,.18,C.wood,x,.08,z+.3);}
function tea(g,x,z){B(g,.6,.5,.5,C.brick,x,.25,z);gableR(g,.72,.66,.24,C.redTile,x,.5,z);for(let i=0;i<3;i++)Cy(g,.06,.07,.14,0x5b4636,x-.15+i*.15,.07,z+.33,8);B(g,.36,.1,.02,0x2f2a26,x,.42,z+.26);}
// --- 海邊 ---
function sea4(g){B(g,1.3,.48,.95,C.white,0,.24,0);hipR(g,1.6,1.25,.42,C.redTile,0,.48,0);for(let i=1;i<4;i++)B(g,1.6-i*.38,.02,.02,C.white,0,.48+i*.1,.63-i*.16);
  B(g,.1,.12,.12,0xd9a03a,0,.94,0);B(g,.06,.06,.06,0xd9a03a,0,1.02,.05);for(let i=0;i<5;i++)B(g,.2,.22,.2,C.stone,-.9+i*.45,.11,.9);win(g,-.35,.26,.48,.3,.2,0x9fc6dd);B(g,.24,.36,.02,C.wood,.3,.18,.48);}
function sea7(g){for(let k of[[-.55,.45],[.55,.45],[-.55,-.4],[.55,-.4]])B(g,.07,.36,.07,C.wood,k[0],.18,k[1]);B(g,1.4,.06,1.3,C.deck,0,.39,.1);
  B(g,1.0,.5,.7,0xbfe0ee,0,.67,-.15);gableR(g,1.15,.95,.32,C.white,0,.92,-.15);for(let i=0;i<7;i++)B(g,.03,.18,.03,C.white,-.66+i*.22,.51,.73);B(g,1.4,.03,.03,C.white,0,.6,.73);
  win(g,-.25,.7,.21,.32,.22,0x9fc6dd);B(g,.22,.36,.02,C.wood,.28,.6,.21);Cy(g,.03,.03,.5,C.white,.55,.65,.45,6);hipR(g,.42,.42,.16,0xe98fb3,.55,.86,.45);}
function sea10(g){B(g,1.1,.52,.85,C.white,0,.26,0);gableR(g,1.25,1.05,.38,0x3f7fb8,0,.52,0);Cy(g,.16,.2,.9,C.white,.72,.45,-.15,10);Cy(g,.17,.17,.08,0xc8452d,.72,.94,-.15,10);
  Cy(g,.12,.12,.16,0xfff1c9,.72,1.06,-.15,10);hipR(g,.34,.34,.16,0xc8452d,.72,1.14,-.15);B(g,.3,.5,1.4,C.deck,-.2,.08,1.2);for(let i=0;i<3;i++)Cy(g,.04,.04,.3,C.wood,-.38,.05,.6+i*.45,6);
  B(g,.18,.1,.45,0xc8452d,.12,.05,1.55);win(g,-.25,.28,.43,.3,.22,0x9fc6dd);}
function kakigori(g,x,z){B(g,.56,.42,.42,C.white,x,.21,z);B(g,.66,.04,.5,0x8fc4dc,x,.46,z+.05);Cy(g,.015,.015,.5,C.wood,x+.36,.25,z+.25,4);B(g,.02,.18,.14,C.white,x+.36,.4,z+.32);B(g,.022,.06,.1,0xc8452d,x+.36,.42,z+.32);}
function dive(g,x,z){B(g,.56,.44,.46,C.deck,x,.22,z);gableR(g,.66,.6,.22,0x3f7fb8,x,.44,z);Cy(g,.06,.06,.3,0xd9a03a,x+.36,.15,z+.25,8);Cy(g,.09,.09,.04,0xc8452d,x-.36,.3,z+.24,10);}
// ---- 調整版：台灣鄉村線、海邊沖繩線 ----
function swallow(g,x,y,z,len){for(let k of[-1,1]){const t=B(g,.06,.06,.18,C.redTile,x+k*len/2,y+.04,z);t.rotation.x=0;const e=B(g,.05,.12,.05,C.redTile,x+k*(len/2+.03),y+.1,z);e.rotation.z=k*.5;}}
function zhengshen(g,x,z,w){   // 正身：紅磚三間、紅瓦、燕尾
  B(g,w,.6,.75,C.brick,x,.3,z);gableR(g,w+.16,1.0,.4,C.redTile,x,.6,z);swallow(g,x,1.0,z,w+.16);
  B(g,.26,.42,.02,C.wood,x,.21,z+.38);for(let k of[-1,1])win(g,x+k*w*.3,.36,z+.38,.2,.18,0x9fc6dd);}
function hulong(g,x,z,len){B(g,.62,.5,len,C.brick,x,.25,z);gableR(g,len+.1,.82,.32,C.redTile,x,.5,z,Math.PI/2);for(let i=0;i<2;i++)B(g,.02,.36,.2,C.wood,x+(x<0?.32:-.32),.2,z-len/4+i*len/2);}
function tw4b(g){zhengshen(g,0,-.1,1.5);B(g,1.6,.02,.6,0xd9c7a6,0,.01,.6);}
function tw7b(g){zhengshen(g,.2,-.45,1.5);hulong(g,-.9,.25,1.1);B(g,1.4,.02,1.0,0xd9c7a6,.3,.01,.35);}
function tw10b(g){zhengshen(g,0,-.6,1.6);hulong(g,-1.12,.15,1.2);hulong(g,1.12,.15,1.2);B(g,1.6,.02,1.25,0xd9c7a6,0,.01,.3);
  Cy(g,.07,.09,.4,C.wood,1.55,.2,1.15,6);for(const [s,y] of [[.42,.48],[.32,.66]])Cy(g,s*.2,s,.22,C.green,1.55,y,1.15,8);
  for(let i=0;i<4;i++)B(g,.18,.03,.12,C.gold,-.3+i*.22,.03,.55);}
function kawara(g,w,d,h,x,y,z){hipR(g,w,d,h,C.redTile,x,y,z);for(let i=1;i<3;i++)B(g,w*(1-i*.3),.02,.02,0xfbf7f1,x,y+i*h*.3,z+d*.5*(1-i*.3)+.01);}
function shisa(g,x,y,z){B(g,.12,.1,.14,0xd9a03a,x,y+.05,z);B(g,.1,.09,.09,0xd9a03a,x,y+.14,z+.04);}
function ryu4(g){B(g,1.2,.46,.9,C.white,0,.23,-.1);kawara(g,1.5,1.2,.4,0,.46,-.1);shisa(g,0,.86,-.1);win(g,-.3,.25,.36,.3,.2,0x9fc6dd);B(g,.24,.36,.02,C.wood,.3,.18,.36);
  for(let i=0;i<6;i++)B(g,.3,.24,.18,C.stone,-.85+i*.34,.12,.85);}
function ryu7(g){ryu4(g);B(g,.7,.4,.6,C.white,-1.15,.2,-.25);kawara(g,.95,.82,.3,-1.15,.4,-.25);B(g,1.2,.06,.25,C.deck,0,.06,.48);
  for(let i=0;i<4;i++){Cy(g,.03,.04,.3,C.wood,1.2,.15,-.6+i*.35,5);hipR(g,.24,.24,.3,C.green,1.2,.26,-.6+i*.35);}}
function ryu10(g){B(g,1.5,.5,1.0,C.white,0,.25,-.25);kawara(g,1.85,1.35,.44,0,.5,-.25);shisa(g,0,.94,-.25);B(g,.7,.4,.6,C.white,-1.35,.2,-.35);kawara(g,.95,.82,.3,-1.35,.4,-.35);
  B(g,1.6,.06,.25,C.deck,0,.06,.38);B(g,.6,.36,.1,C.stone,0,.18,.95);   // ヒンプン（屏風石）
  for(let i=0;i<4;i++){Cy(g,.03,.04,.3,C.wood,1.25,.15,-.7+i*.35,5);hipR(g,.24,.24,.3,C.green,1.25,.26,-.7+i*.35);}
  B(g,.28,.04,1.0,C.deck,1.0,.04,1.45);for(let i=0;i<3;i++)Cy(g,.03,.03,.2,C.wood,.88,.04,1.05+i*.38,5);Cy(g,.02,.02,.36,C.dark,1.1,.22,1.9,5);B(g,.08,.08,.08,0xfff1c9,1.1,.42,1.9);B(g,.16,.08,.38,0xc8452d,1.3,.03,1.55);}
// ---- 台灣城市線：小街屋 → 騎樓街屋 → 洋樓街屋（大稻埕式）----
const TERR=0xd9a07a, BRICKL=0xc9744f;
function arcadeCols(g,x,z,w,h,n,c){for(let i=0;i<n;i++)B(g,.1,h,.1,c,x-w/2+.05+i*(w-.1)/(n-1),h/2,z);B(g,w,.08,.12,c,x,h,z);}
function tcity4(g){   // 小街屋：一層半紅磚、鐵捲門般的木門板、店招
  B(g,.9,.8,1.0,BRICKL,0,.4,0);B(g,.94,.12,1.04,0xe3d7c3,0,.86,0);B(g,.7,.42,.02,C.wood,0,.25,.51);for(let i=0;i<5;i++)B(g,.02,.4,.02,C.dark,-.28+i*.14,.25,.525);
  B(g,.6,.14,.03,0xfff1c9,0,.6,.52);win(g,0,.74,.51,.3,.08,0x9fc6dd);
  B(g,.9,.6,1.0,0xd8cfc2,1.05,.3,.05);gableR(g,1.0,1.1,.3,C.redTile,1.05,.6,.05);}   // 隔壁平房（示意街道感）
function tcity7(g){   // 騎樓街屋：兩層、一樓騎樓
  B(g,1.1,1.25,.85,C.white,0,.625,-.1);arcadeCols(g,0,.42,1.1,.55,3,C.white);B(g,1.1,.06,.55,C.white,0,.6,.17);
  B(g,.34,.42,.02,C.wood,0,.21,.33);for(let k of[-1,1])win(g,k*.3,.92,.34,.26,.3,0x9fc6dd);B(g,1.16,.12,.92,0xe3d7c3,0,1.28,-.1);
  B(g,.5,.12,.02,C.redTile,0,.72,.46);B(g,.06,.32,.16,0xfff1c9,.58,.95,.3);}
function tcity10(g){   // 洋樓街屋：三層、巴洛克山牆立面、連續騎樓、兩開間
  B(g,1.7,1.7,.9,0xe8d2b4,0,.85,-.1);arcadeCols(g,0,.42,1.7,.58,4,0xe8d2b4);B(g,1.7,.06,.55,0xe8d2b4,0,.6,.17);
  for(let r=0;r<2;r++)for(let k of[-1,0,1]){win(g,k*.52,.95+r*.48,.36,.26,.3,0x9fc6dd);B(g,.32,.04,.04,0xb07a52,k*.52,1.12+r*.48,.37);}
  B(g,1.76,.1,.96,0xb07a52,0,1.72,-.1);const sh=new THREE.Shape();sh.moveTo(-.55,0);sh.lineTo(.55,0);sh.lineTo(.55,.12);sh.quadraticCurveTo(.3,.14,.18,.3);sh.lineTo(-.18,.3);sh.quadraticCurveTo(-.3,.14,-.55,.12);sh.lineTo(-.55,0);
  const pd=mk(new THREE.ExtrudeGeometry(sh,{depth:.06,bevelEnabled:false,curveSegments:3}),m(0xe8d2b4));pd.position.set(0,1.77,.29);g.add(pd);B(g,.34,.12,.02,0xc8452d,0,1.9,.36);
  for(let k of[-1,1])B(g,.08,.22,.08,0xb07a52,k*.72,1.88,.3);B(g,.6,.16,.02,0x2f2a26,0,.72,.46);B(g,.36,.42,.02,C.wood,-.4,.21,.33);B(g,.36,.42,.02,C.wood,.4,.21,.33);}
// ---- 西洋線：石造コテージ → 二層洋館 → 塔のある洋館＋庭 ----
const STONEW=0xd8cdbd, SLATE=0x4a5568, TRIM=0xfbf7f0, GREENW=0x3f7a5a;
function chim(g,x,y,z,h){B(g,.14,h,.14,0x9a6b4a,x,y+h/2,z);}
function wst4(g){B(g,1.1,.6,.85,STONEW,0,.3,0);gableR(g,1.24,1.1,.5,SLATE,0,.6,0);chim(g,.4,.75,-.15,.4);B(g,.24,.42,.02,GREENW,0,.21,.43);
  for(let k of[-1,1]){win(g,k*.34,.36,.43,.22,.22,0x9fc6dd);B(g,.05,.22,.02,GREENW,k*.34-.14,.36,.44);B(g,.05,.22,.02,GREENW,k*.34+.14,.36,.44);}
  for(let i=0;i<4;i++)Cy(g,.07,.07,.1,[0xe98fb3,0xf0c66a,0xffffff,0xb9a0e6][i],-.45+i*.3,.05,.62,6);}
function wst7(g){B(g,1.2,1.1,.9,TRIM,0,.55,0);gableR(g,1.34,1.15,.5,SLATE,0,1.1,0);chim(g,.42,1.3,-.2,.4);
  B(g,.4,.7,.25,TRIM,-.3,.35,.55);hipR(g,.5,.35,.18,SLATE,-.3,.7,.55);for(let i=0;i<3;i++)win(g,-.3,.38,.68,.28,.4,0x9fc6dd);
  B(g,.24,.44,.02,GREENW,.3,.22,.46);B(g,.5,.04,.3,TRIM,.3,.47,.6);for(let k of[-1,1])B(g,.04,.44,.04,TRIM,.3+k*.22,.22,.72);
  for(let k of[-1,1])win(g,k*.3,.82,.46,.24,.26,0x9fc6dd);}
function wst10(g){B(g,1.5,1.1,1.0,TRIM,0,.55,-.2);hipR(g,1.75,1.25,.5,SLATE,0,1.1,-.2);chim(g,-.5,1.25,-.4,.45);
  Cy(g,.3,.3,1.6,TRIM,.85,.8,.15,10);const cone=mk(new THREE.ConeGeometry(.38,.6,10),m(SLATE));cone.position.set(.85,1.9,.15);g.add(cone);
  for(let r=0;r<2;r++){for(let k of[-1,0])win(g,-.45+k*-.05+(k?-.0:.4),.38+r*.45,.31,.24,.3,0x9fc6dd);}win(g,.85,.5,.46,.18,.28,0x9fc6dd);win(g,.85,1.1,.46,.18,.28,0x9fc6dd);
  B(g,.3,.5,.02,GREENW,-.1,.25,.31);B(g,1.0,.05,.4,TRIM,-.2,.55,.5);for(let k of[-1,0,1])B(g,.05,.5,.05,TRIM,-.2+k*.45,.25,.68);
  Cy(g,.3,.34,.1,STONEW,-.4,.05,1.25,14);Cy(g,.05,.07,.3,STONEW,-.4,.2,1.25,8);Cy(g,.26,.26,.02,C.sea,-.4,.11,1.25,14);
  for(let i=0;i<7;i++){B(g,.05,.22,.05,TRIM,-1.5+i*.5,.11,1.7);}B(g,3.0,.04,.03,TRIM,0,.2,1.7);
  for(const x of[-1.4,1.4])hipR(g,.36,.36,.42,C.green,x,0,1.25);}
function bakery(g,x,z){B(g,.6,.46,.5,0xf4e1d2,x,.23,z);gableR(g,.72,.66,.26,0x8a5a3c,x,.46,z);B(g,.66,.04,.22,0xc8452d,x,.38,z+.34);B(g,.66,.04,.22,TRIM,x,.34,z+.34);win(g,x,.18,z+.26,.34,.18,0xfff1c9);}
function florist(g,x,z){B(g,.56,.44,.46,0xe5efe0,x,.22,z);gableR(g,.66,.6,.24,GREENW,x,.44,z);for(let i=0;i<5;i++)Cy(g,.06,.06,.08,[0xe98fb3,0xf0c66a,0xffffff,0xc8452d,0xb9a0e6][i],x-.22+i*.11,.06,z+.33,6);B(g,.5,.06,.12,0x8a5a3c,x,.03,z+.33);}
// ---- 細修覆寫 ----
shisa=function(g,x,y,z){B(g,.2,.16,.22,0xd9a03a,x,y+.08,z);B(g,.16,.15,.14,0xd9a03a,x,y+.22,z+.07);B(g,.17,.04,.05,0xc8452d,x,y+.18,z+.15);for(let k of[-1,1])B(g,.04,.06,.04,0xd9a03a,x+k*.06,y+.31,z+.06);};
tw10b=function(g){zhengshen(g,0,-.6,1.6);hulong(g,-1.12,.15,1.2);hulong(g,1.12,.15,1.2);B(g,1.6,.02,1.25,0xd9c7a6,0,.01,.3);
  Cy(g,.07,.09,.4,C.wood,-1.55,.2,-.85,6);for(const [s,y] of [[.42,.48],[.32,.66]])Cy(g,s*.2,s,.22,C.green,-1.55,y,-.85,8);
  for(let i=0;i<4;i++)B(g,.18,.03,.12,C.gold,-.3+i*.22,.03,.55);for(let k of[-1,1])Cy(g,.05,.06,.12,0x5b4636,k*.2,.06,1.0,8);};
tcity4=function(g){B(g,1.0,.85,1.0,BRICKL,0,.425,0);B(g,1.04,.12,1.04,0xe3d7c3,0,.91,0);B(g,.76,.44,.02,C.wood,0,.25,.51);for(let i=0;i<6;i++)B(g,.02,.42,.02,C.dark,-.3+i*.12,.25,.525);
  B(g,.66,.15,.03,0xfff1c9,0,.62,.52);B(g,.6,.08,.02,0xc8452d,0,.62,.535);win(g,0,.77,.51,.36,.1,0x9fc6dd);
  B(g,1.1,.04,.32,0x3f7fb8,0,.52,.66);B(g,.7,.5,.7,BRICKL,0,.25,-.85);gableR(g,.82,.86,.28,C.redTile,0,.5,-.85,Math.PI/2);
  for(let i=0;i<3;i++)B(g,.16,.18,.16,0x8a5a3c,-.35+i*.35,.09,.95);};
wst10=function(g){B(g,1.5,1.1,1.0,TRIM,0,.55,-.2);hipR(g,1.75,1.25,.5,SLATE,0,1.1,-.2);chim(g,-.5,1.25,-.4,.45);
  Cy(g,.3,.3,1.6,TRIM,.85,.8,.15,10);const cone=mk(new THREE.ConeGeometry(.38,.6,10),m(SLATE));cone.position.set(.85,1.9,.15);g.add(cone);
  for(let r=0;r<2;r++)for(const x of[-.5,-.05])win(g,x,.4+r*.45,.31,.24,.3,0x9fc6dd);win(g,.85,.5,.46,.18,.28,0x9fc6dd);win(g,.85,1.1,.46,.18,.28,0x9fc6dd);
  B(g,.28,.5,.02,GREENW,.35,.25,.31);B(g,.6,.05,.4,TRIM,.3,.55,.5);for(let k of[-1,1])B(g,.05,.5,.05,TRIM,.3+k*.26,.25,.68);
  Cy(g,.3,.34,.1,STONEW,-.6,.05,1.15,14);Cy(g,.05,.07,.3,STONEW,-.6,.2,1.15,8);Cy(g,.26,.26,.02,C.sea,-.6,.11,1.15,14);
  for(let i=0;i<7;i++)B(g,.05,.22,.05,TRIM,-1.5+i*.5,.11,1.65);B(g,3.0,.04,.03,TRIM,0,.2,1.65);
  for(const x of[-1.4,1.4])hipR(g,.36,.36,.42,C.green,x,0,1.2);};
ryu10=function(g){B(g,1.5,.5,1.0,C.white,0,.25,-.35);kawara(g,1.85,1.35,.44,0,.5,-.35);shisa(g,0,.94,-.35);B(g,.7,.4,.6,C.white,-1.35,.2,-.45);kawara(g,.95,.82,.3,-1.35,.4,-.45);
  B(g,1.6,.06,.25,C.deck,0,.06,.28);B(g,.6,.36,.1,C.stone,-.3,.18,.85);
  for(let i=0;i<4;i++){Cy(g,.03,.04,.3,C.wood,-1.55,.15,.2+i*.35,5);hipR(g,.24,.24,.3,C.green,-1.55,.26,.2+i*.35);}
  B(g,1.3,.04,.3,C.deck,1.15,.04,1.0);for(let i=0;i<3;i++)Cy(g,.03,.03,.2,C.wood,.6+i*.5,.04,1.18,5);Cy(g,.025,.025,.5,C.dark,1.75,.29,1.0,5);B(g,.12,.12,.12,0xfff1c9,1.75,.58,1.0);hipR(g,.16,.16,.08,C.dark,1.75,.64,1.0);
  B(g,.4,.1,.18,0xc8452d,1.2,.04,1.35);};
// ---- 和風第三階 v2:二層大屋敷(比二階町屋更高更寬) ----
wa10b=function(g){
  B(g,1.8,.62,1.1,C.plaster,0,.41,-.1);B(g,1.82,.1,1.12,C.dark,0,.05,-.1);
  lattice(g,-.35,.4,.455,.9,.4,12);B(g,.3,.48,.02,C.dark,.55,.34,.455);noren(g,.55,.52,.47,.36);
  hipR(g,2.15,1.45,.24,C.tileG,0,.68,-.1);
  B(g,1.2,.46,.8,C.plaster,0,1.05,-.15);B(g,1.22,.06,.82,C.dark,0,.84,-.15);
  for(let i=0;i<3;i++)win(g,-.36+i*.36,1.06,.255,.26,.26,0xfdfaf2);lattice(g,0,1.06,.262,1.0,.26,10);
  hipR(g,1.6,1.2,.46,C.tileG,0,1.27,-.15);
  B(g,1.9,.08,.3,C.deck,0,.12,.6);
  B(g,.8,.46,.62,C.plaster,-1.3,.27,-.35);hipR(g,1.0,.85,.32,C.tileG,-1.3,.5,-.35);
  Cy(g,.36,.36,.03,C.sea,.95,.02,1.05,14);for(let i=0;i<4;i++)Cy(g,.07,.08,.06,C.stone,.62+i*.12,.03,1.37-i*.08,6);
  Cy(g,.04,.06,.22,C.stone,1.55,.11,.6,6);B(g,.14,.1,.14,C.stone,1.55,.27,.6);hipR(g,.2,.2,.08,C.stone,1.55,.32,.6);
  Cy(g,.05,.06,.3,C.wood,-.5,.15,1.15,6);hipR(g,.5,.4,.22,C.green,-.5,.28,1.15);hipR(g,.38,.32,.18,C.green,-.5,.42,1.15);
  for(let i=0;i<7;i++)B(g,.04,.2,.04,C.wood,-1.5+i*.5,.1,1.55);B(g,3.0,.03,.03,C.wood,0,.17,1.55);};

;
// ---- wa5.js ----
// 和風五階（美術 11/9 試畫）：每一階保留前一階長出來的東西
function yard(g){for(let i=0;i<4;i++)Cy(g,.07,.08,.05,C.stone,.15+i*.08,.025,.95+i*.22,6);
  for(let i=0;i<6;i++)B(g,.04,.22,.04,0x6b7a3e,-1.55+i*.22,.11,1.2);B(g,1.15,.03,.03,0x6b7a3e,-1.0,.18,1.2);B(g,1.15,.03,.03,0x6b7a3e,-1.0,.09,1.2);
  Cy(g,.04,.06,.22,C.stone,1.2,.11,.95,6);B(g,.14,.1,.14,C.stone,1.2,.27,.95);hipR(g,.2,.2,.08,C.stone,1.2,.32,.95);}
function wa4b(g){wa4(g);yard(g);}                 // ② 平房＋前庭（竹垣、飛石、石燈籠）
function wa7k(g){wa7(g);yard(g);}                 // ③ 二階町家（前庭保留）
function wa7b(g){wa7k(g);B(g,.8,.46,.62,C.plaster,-1.05,.27,-.25);B(g,.82,.08,.64,C.dark,-1.05,.04,-.25);hipR(g,1.0,.85,.32,C.tileG,-1.05,.5,-.25);B(g,.2,.3,.02,C.dark,-1.05,.17,.065);} // ④ 加偏屋
// 11/9 修：二階不再換成窄町家，改成平房（1.5 寬）原地加蓋二樓，寬度只增不減
function wa7w(g){B(g,1.5,.55,.95,C.plaster,0,.37,0);B(g,1.52,.1,.97,C.dark,0,.05,0);
  B(g,1.7,.08,.32,C.deck,0,.12,.62);for(let i=0;i<4;i++)win(g,-.54+i*.36,.38,.48,.3,.34,0xfdfaf2);lattice(g,0,.38,.49,1.42,.34,12);
  hipR(g,1.85,1.25,.2,C.tileG,0,.64,0);                       // 一樓下屋根
  B(g,1.0,.42,.75,C.plaster,0,.95,-.05);B(g,1.02,.05,.77,C.dark,0,.76,-.05);
  for(let i=0;i<3;i++)win(g,-.3+i*.3,.96,.33,.24,.24,0xfdfaf2);lattice(g,0,.96,.335,.86,.24,9);
  hipR(g,1.35,1.05,.4,C.tileG,0,1.16,-.05);}
function wa7k(g){wa7w(g);yard(g);}
function wa7b(g){wa7k(g);B(g,.8,.46,.62,C.plaster,-1.25,.27,-.25);B(g,.82,.08,.64,C.dark,-1.25,.04,-.25);hipR(g,1.0,.85,.32,C.tileG,-1.25,.5,-.25);B(g,.2,.3,.02,C.dark,-1.25,.17,.065);}

;
// ---- five5.js ----
// 五條線 主屋五階：新補的 ② ④（美術 11/9）。每一階都保留上一階長出來的東西。
const STRAW=0xd9b45a,BAM=0xc9a66b;
// 台灣鄉村
function twrYard(g){for(const [x,z] of [[1.05,.8],[1.3,.5]]){Cy(g,.16,.2,.2,STRAW,x,.1,z,8);hipR(g,.3,.3,.12,STRAW,x,.2,z);}Cy(g,.22,.22,.02,BAM,-.75,.02,.85,10);}
function tw4c(g){tw4b(g);twrYard(g);}
function tw7k(g){tw7b(g);twrYard(g);}
function tw7c(g){tw7k(g);B(g,.08,.24,.9,C.brick,1.55,.12,.45);B(g,.6,.24,.08,C.brick,1.28,.12,.95);Cy(g,.12,.1,.2,0x5b4636,-.25,.1,1.0,8);}
// 台灣城市
function cart(g,x,z){B(g,.42,.2,.26,C.wood,x,.2,z);for(const k of[-1,1]){Cy(g,.07,.07,.03,C.dark,x+k*.14,.07,z+.14,8);}for(const k of[-1,1])B(g,.02,.36,.02,C.dark,x+k*.19,.45,z);B(g,.52,.03,.36,0x3f7fb8,x,.63,z);B(g,.3,.06,.02,0xfff1c9,x,.36,z+.14);}
function tcity4c(g){tcity4(g);cart(g,1.0,.75);}
function tcity7k(g){tcity7(g);cart(g,1.0,.75);}
function tcity7c(g){tcity7k(g);B(g,.7,.3,.5,0xd8d4ce,-.1,1.49,-.25);B(g,.8,.03,.6,0x6f8fa6,-.1,1.66,-.25);Cy(g,.1,.1,.22,0x9fb3c0,.38,1.48,.05,8);win(g,-.1,1.5,.005,.3,.14,0x9fc6dd);}
// 沖繩
function ryuYard(g){for(const k of[-1,1])B(g,.16,.42,.16,C.stone,k*1.1,.21,.85);Cy(g,.1,.08,.12,0x8a5a3c,1.15,.06,.55,8);hipR(g,.22,.22,.16,0xc8452d,1.15,.12,.55);}
function ryu4c(g){ryu4(g);ryuYard(g);}
function ryu7k(g){ryu7(g);ryuYard(g);}
function ryu7c(g){ryu7k(g);Cy(g,.15,.15,.16,C.stone,.55,.08,1.25,10);Cy(g,.11,.11,.17,0x2f4a5a,.55,.09,1.25,10);for(const k of[-1,1])B(g,.03,.34,.03,C.wood,.55+k*.13,.25,1.25);B(g,.36,.03,.2,C.redTile,.55,.43,1.25);}
// 西洋
function picket(g){for(let i=0;i<9;i++)B(g,.04,.2,.03,TRIM,-.95+i*.24,.1,.98);B(g,1.95,.03,.03,TRIM,0,.15,.98);for(const k of[-1,1])B(g,.04,.5,.04,TRIM,k*.2,.25,.72);B(g,.44,.04,.06,TRIM,0,.5,.72);}
function wst4c(g){wst4(g);picket(g);}
function wst7k(g){wst7(g);picket(g);}
function wst7c(g){wst7k(g);B(g,.5,.34,.5,0xcfe6ef,1.05,.17,-.15);gableR(g,.54,.54,.18,0xcfe6ef,1.05,.34,-.15);for(const k of[-1,1])B(g,.03,.34,.52,0xffffff,1.05+k*.25,.17,-.15);}
// 門前小景（附屬第三步，A、B 一起加）
function bench(g,x,z){B(g,.36,.03,.12,C.wood,x,.12,z);for(const k of[-1,1])B(g,.03,.12,.1,C.wood,x+k*.15,.06,z);}
const SC={
 chashitsu:(g,x,z)=>{for(let i=0;i<3;i++)Cy(g,.06,.07,.04,C.stone,x-.1+i*.1,.02,z+.4+i*.1,6);Cy(g,.08,.1,.1,C.stone,x+.25,.05,z+.45,8);Cy(g,.06,.06,.01,C.sea,x+.25,.105,z+.45,8);},
 sento:(g,x,z)=>{bench(g,x-.1,z+.45);Cy(g,.06,.05,.1,0xb08356,x+.25,.05,z+.45,8);},
 kamaa:(g,x,z)=>{bench(g,x-.12,z+.5);B(g,.14,.24,.1,0xc8452d,x+.28,.12,z+.45);},
 tea:(g,x,z)=>{for(const k of[-1,1])Cy(g,.14,.14,.02,BAM,x+k*.18,.04,z+.48,10);},
 kakigori:(g,x,z)=>{Cy(g,.015,.015,.4,C.wood,x-.2,.2,z+.5,4);hipR(g,.4,.4,.08,0x8fc4dc,x-.2,.38,z+.5);Cy(g,.1,.1,.03,C.white,x-.2,.16,z+.5,8);},
 dive:(g,x,z)=>{for(const k of[-1,1])B(g,.03,.3,.03,C.wood,x-.15+k*.2,.15,z+.45);B(g,.4,.03,.03,C.wood,x-.15,.28,z+.45);for(let i=0;i<2;i++)B(g,.1,.24,.02,[0xf0c66a,0x3f7fb8][i],x-.22+i*.14,.14,z+.47);},
 bakery:(g,x,z)=>{Cy(g,.1,.1,.02,TRIM,x-.15,.16,z+.48,8);Cy(g,.015,.015,.16,C.dark,x-.15,.08,z+.48,4);for(const k of[-1,1])B(g,.07,.1,.07,0x8a5a3c,x-.15+k*.17,.05,z+.48);},
 florist:(g,x,z)=>{for(let i=0;i<3;i++){B(g,.36,.03,.1,0x8a5a3c,x-.05,.05+i*.08,z+.42+i*-.04);for(let j=0;j<2;j++)Cy(g,.03,.03,.05,[0xe98fb3,0xf0c66a,0xb9a0e6][(i+j)%3],x-.11+j*.2,.09+i*.08,z+.42-i*.04,5);}}
};
function tcity10c(g){tcity10(g);cart(g,1.0,.75);}

;
// ---- flat.js ----
// 正式寫法前的「改平面」版（美術 11/9，照工程評估第三節）：窗、格子、暖簾改成貼牆的平面（2 面），半徑 <0.05 的圓柱改 5 段
function P(g,w,h,c,x,y,z,ry){const p=mk(new THREE.PlaneGeometry(w,h),m(c));p.position.set(x,y,z+.006);if(ry)p.rotation.y=ry;g.add(p);return p;}
win=function(g,x,y,z,w,h,c){return P(g,w,h,c||C.blue,x,y,z);};
lattice=function(g,x,y,z,w,h,n){for(let i=0;i<n;i++)P(g,.03,h,C.dark,x-w/2+(i+.5)*w/n,y,z);};
noren=function(g,x,y,z,w,c){for(let i=0;i<3;i++)P(g,w/3-.015,w*.55,c||C.noren,x-w/3+i*w/3,y,z);};
const _Cy=Cy;Cy=function(g,rt,rb,h,c,x,y,z,seg){if(Math.max(rt,rb)<.05)seg=Math.min(seg||8,5);return _Cy(g,rt,rb,h,c,x,y,z,seg);};
// 細桿（三邊有兩邊 ≤0.05：籬笆柱、欄杆、旗桿）改成單片平面，面向正面
const _B=B;B=function(g,w,h,d,c,x,y,z,ry){const thin=[w,h,d].filter(v=>v<=.05).length>=2;if(!thin)return _B(g,w,h,d,c,x,y,z,ry);
  const p=mk(d<=w?new THREE.PlaneGeometry(w,h):new THREE.PlaneGeometry(d,h),m(c));p.position.set(x,y,z);if(d>w)p.rotation.y=Math.PI/2;if(ry)p.rotation.y+=ry;p.material.side=THREE.DoubleSide;g.add(p);return p;};

;
// ---- tight.js ----
// 收緊版（美術 11/9）：爸爸 選「新家放大＋改建演出」，scale 回到約 1.3。
// 工程上限（世界座標）：植木屋 18°、音樂廳 90°、書店 162° 各 ±30° 內 ≤2.3，其他方向 ≤3.0。前庭、籬笆、樹、碼頭往內收。
// 和風前庭竹垣：縮短、往內
function yard(g){for(let i=0;i<4;i++)Cy(g,.07,.08,.05,C.stone,.15+i*.08,.025,.9+i*.08,6);
  for(let i=0;i<6;i++)B(g,.04,.22,.04,0x6b7a3e,-1.2+i*.18,.11,1.02);B(g,.95,.03,.03,0x6b7a3e,-.75,.18,1.02);B(g,.95,.03,.03,0x6b7a3e,-.75,.09,1.02);
  Cy(g,.04,.06,.22,C.stone,1.0,.11,.85,6);B(g,.14,.1,.14,C.stone,1.0,.27,.85);hipR(g,.2,.2,.08,C.stone,1.0,.32,.85);}
// 和風最終：圍籬、樹、水池往內
wa10b=function(g){
  B(g,1.8,.62,1.1,C.plaster,0,.41,-.1);B(g,1.82,.1,1.12,C.dark,0,.05,-.1);
  lattice(g,-.35,.4,.455,.9,.4,12);B(g,.3,.48,.02,C.dark,.55,.34,.455);noren(g,.55,.52,.47,.36);
  hipR(g,2.15,1.45,.24,C.tileG,0,.68,-.1);
  B(g,1.2,.46,.8,C.plaster,0,1.05,-.15);B(g,1.22,.06,.82,C.dark,0,.84,-.15);
  for(let i=0;i<3;i++)win(g,-.36+i*.36,1.06,.255,.26,.26,0xfdfaf2);lattice(g,0,1.06,.262,1.0,.26,10);
  hipR(g,1.6,1.2,.46,C.tileG,0,1.27,-.15);
  B(g,1.9,.08,.3,C.deck,0,.12,.6);
  B(g,.8,.46,.62,C.plaster,-1.15,.27,-.4);hipR(g,1.0,.85,.32,C.tileG,-1.15,.5,-.4);
  Cy(g,.3,.3,.03,C.sea,.85,.02,.98,14);for(let i=0;i<4;i++)Cy(g,.07,.08,.06,C.stone,.55+i*.1,.03,1.22-i*.06,6);
  Cy(g,.04,.06,.22,C.stone,1.3,.11,.5,6);B(g,.14,.1,.14,C.stone,1.3,.27,.5);hipR(g,.2,.2,.08,C.stone,1.3,.32,.5);
  Cy(g,.05,.06,.3,C.wood,-.5,.15,1.0,6);hipR(g,.5,.4,.22,C.green,-.5,.28,1.0);hipR(g,.38,.32,.18,C.green,-.5,.42,1.0);
  for(let i=0;i<7;i++)B(g,.04,.2,.04,C.wood,-1.1+i*.366,.1,1.22);B(g,2.2,.03,.03,C.wood,0,.17,1.22);};
// 台灣鄉村④：矮磚牆往內
function tw7c(g){tw7k(g);B(g,.08,.24,.75,C.brick,1.3,.12,.55);B(g,.5,.24,.08,C.brick,1.05,.12,.93);Cy(g,.12,.1,.2,0x5b4636,-.25,.1,.95,8);}
function twrYard(g){for(const [x,z] of [[.95,.75],[1.15,.45]]){Cy(g,.16,.2,.2,STRAW,x,.1,z,8);hipR(g,.3,.3,.12,STRAW,x,.2,z);}Cy(g,.22,.22,.02,BAM,-.7,.02,.8,10);}
// 沖繩最終：福木、碼頭、燈、小船往內
ryu10=function(g){B(g,1.5,.5,1.0,C.white,0,.25,-.35);kawara(g,1.85,1.35,.44,0,.5,-.35);shisa(g,0,.94,-.35);B(g,.7,.4,.6,C.white,-1.2,.2,-.45);kawara(g,.95,.82,.3,-1.2,.4,-.45);
  B(g,1.6,.06,.25,C.deck,0,.06,.28);B(g,.6,.36,.1,C.stone,-.3,.18,.8);
  for(let i=0;i<4;i++){Cy(g,.03,.04,.3,C.wood,-1.25,.15,-.05+i*.3,5);hipR(g,.24,.24,.3,C.green,-1.25,.26,-.05+i*.3);}
  B(g,.9,.04,.3,C.deck,.85,.04,.95);for(let i=0;i<3;i++)Cy(g,.03,.03,.2,C.wood,.5+i*.35,.04,1.1,5);Cy(g,.025,.025,.5,C.dark,1.25,.29,.95,5);B(g,.12,.12,.12,0xfff1c9,1.25,.58,.95);hipR(g,.16,.16,.08,C.dark,1.25,.64,.95);
  B(g,.4,.1,.18,0xc8452d,.8,.04,1.25);};
function ryuYard(g){for(const k of[-1,1])B(g,.16,.42,.16,C.stone,k*1.05,.21,.85);Cy(g,.1,.08,.12,0x8a5a3c,1.05,.06,.55,8);hipR(g,.22,.22,.16,0xc8452d,1.05,.12,.55);}
// 西洋最終：圍籬、樹、噴水池往內
wst10=function(g){B(g,1.5,1.1,1.0,TRIM,0,.55,-.2);hipR(g,1.75,1.25,.5,SLATE,0,1.1,-.2);chim(g,-.5,1.25,-.4,.45);
  Cy(g,.3,.3,1.6,TRIM,.85,.8,.15,10);const cone=mk(new THREE.ConeGeometry(.38,.6,10),m(SLATE));cone.position.set(.85,1.9,.15);g.add(cone);
  for(let r=0;r<2;r++)for(const x of[-.5,-.05])win(g,x,.4+r*.45,.31,.24,.3,0x9fc6dd);win(g,.85,.5,.46,.18,.28,0x9fc6dd);win(g,.85,1.1,.46,.18,.28,0x9fc6dd);
  B(g,.28,.5,.02,GREENW,.35,.25,.31);B(g,.6,.05,.4,TRIM,.3,.55,.5);for(let k of[-1,1])B(g,.05,.5,.05,TRIM,.3+k*.26,.25,.68);
  Cy(g,.26,.3,.1,STONEW,-.65,.05,.98,14);Cy(g,.05,.07,.3,STONEW,-.65,.2,.98,8);Cy(g,.22,.22,.02,C.sea,-.65,.11,.98,14);
  for(let i=0;i<7;i++)B(g,.05,.22,.05,TRIM,-1.05+i*.35,.11,1.25);B(g,2.1,.04,.03,TRIM,0,.2,1.25);
  for(const x of[-1.1,1.1])hipR(g,.36,.36,.42,C.green,x,0,.95);};
function picket(g){for(let i=0;i<8;i++)B(g,.04,.2,.03,TRIM,-.84+i*.24,.1,.95);B(g,1.72,.03,.03,TRIM,0,.15,.95);for(const k of[-1,1])B(g,.04,.5,.04,TRIM,k*.2,.25,.72);B(g,.44,.04,.06,TRIM,0,.5,.72);}
// 和風④偏屋、沖繩⑤離れ往內
function wa7b(g){wa7k(g);B(g,.8,.46,.62,C.plaster,-1.1,.27,-.25);B(g,.82,.08,.64,C.dark,-1.1,.04,-.25);hipR(g,1.0,.85,.32,C.tileG,-1.1,.5,-.25);B(g,.2,.3,.02,C.dark,-1.1,.17,.065);}

;
// ---- flowers.js ----
// 門口花圃（家具 flower，h.flowers 才蓋）：五條線共用同一個樣子、同一個位置（美術 11/9）
// 位置 (-0.7, 1.5)：門的左前方，五線主屋五階都空著；scale 1.3 下外角 r≈2.17／上限 2.3。
// 26 面：木花槽 10 面（沒有底）＋ 4 朵花各 4 面（四角錐，沒有底）。全部蓋完最多 758＋26＝784（≤800）。
// 花色照 classic：粉、黃、白、淡紫。信箱不補（v2.14 已把信箱功能移到首頁；新線各有自己的門牌）。
const FLOWER_AT={wa:[1.3,0.2],twr:[-0.4,1.3],twc:[-0.4,1.25],ryu:[-0.35,1.2],wst:[0.35,1.2]};
function _quadBox(g,w,h,d,c,x,y,z){   // 沒有底的盒子
  const W=w/2,D=d/2,v=[];const P=(a,b,c2,e)=>v.push(...a,...b,...c2,...a,...c2,...e);
  const t=[[-W,h,-D],[W,h,-D],[W,h,D],[-W,h,D]],b=[[-W,0,-D],[W,0,-D],[W,0,D],[-W,0,D]];
  P(t[3],t[2],t[1],t[0]);P(b[3],b[2],t[2],t[3]);P(b[1],b[0],t[0],t[1]);P(b[2],b[1],t[1],t[2]);P(b[0],b[3],t[3],t[0]);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.computeVertexNormals();
  const o=mk(geo,m(c));o.position.set(x,y,z);g.add(o);return o;}
function _bloom(g,r,h,c,x,y,z){       // 四角錐花朵，4 面
  const q=[[r,0,0],[0,0,r],[-r,0,0],[0,0,-r]],top=[0,h,0],v=[];
  for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4];v.push(...b,...a,...top);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.computeVertexNormals();
  const o=mk(geo,m(c));o.position.set(x,y,z);g.add(o);return o;}
function flowerbed(g,style){const [x,z]=FLOWER_AT[style]||FLOWER_AT.twr;
  _quadBox(g,.5,.12,.2,C.wood,x,0,z);
  [0xe98fb3,0xf0c66a,0xffffff,0xb9a0e6].forEach((c,i)=>_bloom(g,.08,.09,c,x-.18+i*.12,.12,z+(i%2?.03:-.03)));}

  // 每條線：主屋五階、附屬 A／B、門前小景（美術 hh11.html 的 L 表）
  const L = { wa: [wa4, wa4b, wa7k, wa7b, wa10b, 'chashitsu', 'sento'], twr: [tw4b, tw4c, tw7k, tw7c, tw10b, 'kamaa', 'tea'], twc: [tcity4, tcity4c, tcity7k, tcity7c, tcity10c, 'kamaa', 'tea'],
    ryu: [ryu4, ryu4c, ryu7k, ryu7c, ryu10, 'kakigori', 'dive'], wst: [wst4, wst4c, wst7k, wst7c, wst10, 'bakery', 'florist'] };
  const F = { chashitsu, sento, kamaa, tea, kakigori, dive, bakery, florist };
  const PA = [-1.35, -1.1], PB = [0.95, -1.3];   // 附屬 A 左後、B 右後（美術 fit.js，收緊版 scale 1.3 全部在工程上限內）
  // 窗：flat.js 的 win 換成平面，這裡再標 glass，晚上要亮
  const _win = win; win = function () { const p = _win.apply(null, arguments); if (p) p.userData.glass = true; return p; };
  /** style：wa／twr／twc／ryu／wst；main：主屋 1～5；annex：附屬 0～3；first：'a'／'b' 先蓋哪一間；flowers：擺了門口花圃 */
  function build(style, main, annex, first, flowers) {
    const l = L[style]; if (!l || !(main >= 1)) return null;
    const g = new THREE.Group();
    l[Math.min(5, main) - 1](g);
    const fx = new THREE.Group();   // 附屬全部是固定色
    const one = (k, at) => { F[l[5 + k]](fx, at[0], at[1]); if (annex >= 3) SC[l[5 + k]](fx, at[0], at[1]); };
    if (annex >= 1) { const a = first === 'b' ? 1 : 0; one(a, a ? PB : PA); if (annex >= 2) one(1 - a, a ? PA : PB); }
    if (flowers) flowerbed(fx, style);   // 花圃也是固定色（白花不能被當成白牆換色）
    fx.traverse(o => { if (o.isMesh) o.userData.fixed = true; });
    g.add(fx);
    return g;
  }
  // 每條線哪些顏色吃玩家選的牆色／屋頂色（美術 我的家_零件色彩角色.md）；預設色＝樣稿色
  const ROLE = { wa: { wall: [C.plaster] }, twr: { roof: [C.redTile] }, twc: { wall: [C.white], roof: [C.redTile] }, ryu: { wall: [C.white] }, wst: { wall: [TRIM], roof: [SLATE] } };
  window.Home3D = { build, ROLE, STYLES: Object.keys(L), PA, PB };
})();
