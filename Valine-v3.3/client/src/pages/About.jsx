import patternImg from '/assets/pattern.jpg';

export default function About(){
  return (
    <div>
      <img src={patternImg} alt="Abstract collaboration pattern" style={{width:'100%',height:280,objectFit:'cover',borderRadius:'0 0 12px 12px',marginBottom:20}} />
      <section className="marketing-section">
        <h1 style={{textAlign:'center',marginTop:0}}>About Joint</h1>
        <div className="grid-3">
          <div className="card"><h3>Mission</h3><p>Champion emerging artists by connecting them with observers and opportunities.</p></div>
          <div className="card"><h3>Vision</h3><p>Seamless discovery, feedback, and collaboration across web + live showcases.</p></div>
          <div className="card"><h3>Values</h3><p>Autonomy, access, and community — built for creators at every level.</p></div>
        </div>
      </section>
      <section className="marketing-section" style={{background:'#0f1719',color:'#dbecec'}}>
        <h2>From Online to Onstage</h2>
        <p>Joint aims to host recurring socials and live showcases in LA/NY, turning online momentum into on‑stage careers.</p>
      </section>
    </div>
  );
}
