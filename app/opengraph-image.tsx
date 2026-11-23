import { ImageResponse } from 'next/og';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() { return new ImageResponse(<div style={{display:'flex', flexDirection:'column', justifyContent:'space-between', width:'100%', height:'100%', background:'#070809', color:'#e5e8ec', padding:'70px 80px', fontFamily:'sans-serif'}}><span style={{fontSize:24, letterSpacing:5}}>VM / PORTFOLIO</span><div style={{display:'flex',flexDirection:'column'}}><span style={{fontSize:75,fontWeight:700}}>Vhon Eric Mercado</span><span style={{fontSize:32, color:'#9aa4ae'}}>Thoughtful interfaces. Useful software.</span></div><span style={{fontSize:20}}>SOFTWARE DEVELOPMENT · MANILA, PH</span></div>, size); }
