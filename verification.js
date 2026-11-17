/* =====================================================================
   TDDK : module « Confiance et sécurité »
   - Vérification d'identité (CNI recto/verso, selfie, test de présence, activité, charte)
   - Onglet Investir : projets d'investissement avec fiche détaillée (dirigeant, budget, étapes, documents)
   - Fiches des tontines et des invitations (créateur vérifié, règles)
   - Vérification obligatoire pour créer une tontine ou investir dans un projet
   Chargé par index.html, après les scripts principaux. Tout est simulé :
   aucune photo ni donnée n'est envoyée nulle part.
   ===================================================================== */
(() => {
/* ----- Styles ----- */
const sty = document.createElement('style');
sty.textContent = `
.av{width:56px;height:56px;border-radius:50%;background:var(--prim);color:var(--sur-prim);display:grid;place-items:center;font:700 20px var(--f-titre);flex:none}
.id-l{display:flex;gap:14px;align-items:center}
.cache{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden}
label.btn{position:relative}
.btn:has(.cache:focus-visible){outline:3px solid var(--focus);outline-offset:3px}
.phv{border:2px dashed var(--trait);border-radius:20px;min-height:140px;display:grid;place-items:center;overflow:hidden;background:var(--surf);margin-top:8px;color:var(--txt2)}
.phv img{width:100%;max-height:260px;object-fit:cover;display:block}
.phv svg{width:100%;max-height:210px;display:block}
.ck{list-style:none;padding:0;margin:10px 0 0;display:grid;gap:8px}
.ck li{display:flex;gap:10px;align-items:flex-start;font-size:17px}
.ck .ic{width:22px;height:22px;flex:none;color:var(--ok);margin-top:1px}
.ck li.non,.ck li.non .ic{color:var(--txt2)}
ul.pt{margin:10px 0 0 20px;display:grid;gap:8px}
.pres{margin-top:12px;border-radius:18px;padding:14px 16px;font-weight:700;background:var(--mangue-pale);border-left:8px solid var(--mangue)}
.pres.ok{background:var(--ok);color:var(--sur-ok);border-color:var(--ok)}
.qui{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.qui>div{border:2px solid var(--ligne);border-radius:18px;background:var(--surf);padding:12px;font-size:16px}
.qui b{display:block;margin-bottom:4px}
`;
document.head.appendChild(sty);
Object.assign(ICONES, {
  carte:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M14 10h4M14 14h4M6 16h6"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  chevron:ICONES.chevron || '<path d="M9 5l7 7-7 7"/>'
});

/* ----- Outils ----- */
const ext = () => { const d = D(); if (!d.ext) d.ext = {objectifs:[],contestations:{},tickets:[],mises:[],partage:false}; return d.ext; };
const NIV = ['Non vérifié','Téléphone vérifié','Identité vérifiée','Identité et activité vérifiées'];
const pour = (c,m) => Math.max(0,Math.min(100,Math.round(100*c/m)));
const ini = (p,n) => ((p||'?')[0] + ((n||'')[0]||'')).toUpperCase();
const badge = niv => `<span class="st ${niv>=2?'paye':'attente'}">${ic(niv>=2?'check':'dash')}${NIV[niv]||NIV[1]}</span>`;
const ret = (k,o) => `data-act="sous" data-k="${k}" data-o="${o}"`;
const age = dn => { const d = new Date(dn), t = new Date(); let a = t.getFullYear()-d.getFullYear(); const m = t.getMonth()-d.getMonth(); if (m<0 || (m===0 && t.getDate()<d.getDate())) a--; return a; };
const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const SECU = ['Identité du créateur contrôlée : carte d’identité, selfie et test de présence','TDDK ne détient jamais l’argent : il passe par un acteur agréé','Comptes et décisions visibles par tous les membres','Tu peux signaler un problème à tout moment'];

/* =====================================================================
   DONNÉES : créateurs et fiches (exemples fictifs, pour la démonstration)
   ===================================================================== */
const CRE = {
  awa:{p:'Awa',n:'Ndiaye',age:34,q:'Pikine',pro:'Commerçante depuis 9 ans',dep:'mars 2025',niv:3},
  ibra:{p:'Ibrahima',n:'Faye',age:41,q:'Kaolack',pro:'Agriculteur, secrétaire d’une coopérative',dep:'juin 2025',niv:3},
  mar:{p:'Mariama',n:'Diop',age:47,q:'Médina',pro:'Gérante d’un atelier de couture',dep:'janvier 2026',niv:3},
  cheikh:{p:'Cheikh Tidiane',n:'Gueye',age:49,q:'Keur Massar',pro:'Ingénieur en bâtiment, dirigeant de Sahel Habitat',dep:'avril 2026',niv:3},
  fatim:{p:'Fatimata',n:'Ba',age:38,q:'Médina',pro:'Couturière, dirigeante de l’Atelier Teranga',dep:'mai 2026',niv:3},
  mamadou:{p:'Mamadou',n:'Sy',age:44,q:'Niayes',pro:'Maraîcher, président de la coopérative Niaye Vert',dep:'mai 2026',niv:3},
  khady:{p:'Ndeye Khady',n:'Fall',age:52,q:'Pikine',pro:'Promotrice immobilière depuis 12 ans',dep:'février 2026',niv:3},
  ousmane:{p:'Ousmane',n:'Diallo',age:36,q:'Thiès',pro:'Éleveur de volailles depuis 8 ans',dep:'juin 2026',niv:3},
  fatou:{p:'Fatou',n:'Seck',age:39,q:'Parcelles Assainies',pro:'Commerçante au marché',dep:'mars 2025',niv:2}
};
const PR = [
  {id:'p1',sec:'Immobilier',nom:'Résidence étudiante, Keur Massar',lieu:'Keur Massar',op:'Sahel Habitat (exemple)',cr:'cheikh',obj:60000000,col:41000000,tk:100000,duree:'24 mois',risque:'Moyen',
    acteur:'une banque partenaire agréée (exemple)',
    desc:'Construction de 24 chambres meublées pour étudiants, à 10 minutes d’un campus. Les chambres sont louées au mois et gérées par Sahel Habitat. Le terrain appartient à l’entreprise, avec titre foncier et permis de construire.',
    budget:[['Gros œuvre',32000000],['Second œuvre et finitions',14000000],['Mobilier des 24 chambres',6000000],['Frais et permis',3000000],['Réserve de sécurité',5000000]],
    etapes:[['Mois 1 à 10','Construction du bâtiment'],['Mois 11 à 12','Finitions et meubles'],['Mois 13 à 24','Location et premiers retours aux investisseurs']],
    rev:'Les revenus attendus viennent des loyers. Ils ne sont pas garantis : les chambres peuvent rester vides.',
    docs:[['Carte d’identité du dirigeant',1],['NINEA et registre du commerce',1],['Titre foncier du terrain',1],['Permis de construire',1],['Rapport d’un ingénieur indépendant',0]]},
  {id:'p2',sec:'Entrepreneuriat',nom:'Atelier de couture, Médina',lieu:'Médina',op:'Atelier Teranga (exemple)',cr:'fatim',obj:8000000,col:3200000,tk:50000,duree:'18 mois',risque:'Élevé',
    acteur:'une plateforme de financement agréée (exemple)',
    desc:'Fatimata Ba dirige un atelier de couture à la Médina depuis 6 ans. Elle veut acheter 6 machines et un stock de tissu pour répondre à des commandes d’uniformes scolaires, et former 4 apprenties.',
    budget:[['6 machines à coudre',3600000],['Stock de tissu',2200000],['Aménagement de l’atelier',1000000],['Formation des apprenties',700000],['Réserve de sécurité',500000]],
    etapes:[['Mois 1','Achat des machines et du tissu'],['Mois 2 à 6','Production des commandes d’uniformes'],['Mois 7 à 18','Remboursement mensuel des investisseurs']],
    rev:'Les revenus attendus viennent de la vente des commandes. Ils ne sont pas garantis.',
    docs:[['Carte d’identité de la dirigeante',1],['Registre de commerce',1],['Bons de commande des écoles',1],['Devis des machines',0]]},
  {id:'p3',sec:'Agriculture',nom:'Maraîchage irrigué, Niayes',lieu:'Niayes',op:'Coopérative Niaye Vert (exemple)',cr:'mamadou',obj:15000000,col:9000000,tk:25000,duree:'12 mois',risque:'Moyen',
    acteur:'une institution de microfinance agréée (exemple)',
    desc:'La coopérative cultive 3 hectares de légumes (oignons, choux, tomates) vendus aux marchés de Dakar. Le projet finance un forage, un goutte-à-goutte et les semences pour produire toute l’année.',
    budget:[['Forage et pompe',6000000],['Goutte-à-goutte',4500000],['Semences et engrais',2500000],['Main-d’œuvre',1500000],['Réserve de sécurité',500000]],
    etapes:[['Mois 1 à 2','Forage et installation'],['Mois 3 à 8','Cultures et ventes aux marchés'],['Mois 9 à 12','Remboursement des investisseurs']],
    rev:'Les revenus attendus viennent de la vente des récoltes. Ils ne sont pas garantis : la météo et les prix peuvent changer.',
    docs:[['Carte d’identité du président',1],['Reconnaissance de la coopérative',1],['Bail du terrain de 3 hectares',1],['Étude du forage',1]]},
  {id:'p4',sec:'Immobilier',nom:'Boutiques en rez-de-chaussée, Pikine',lieu:'Pikine',op:'Pikine Immo (exemple)',cr:'khady',obj:25000000,col:12500000,tk:50000,duree:'20 mois',risque:'Faible',
    acteur:'une banque partenaire agréée (exemple)',
    desc:'Aménagement de 5 petits locaux commerciaux au rez-de-chaussée d’un immeuble déjà construit, sur une rue passante de Pikine. Les locaux sont loués à des commerçants du quartier, avec promesses de bail déjà signées pour 3 d’entre eux.',
    budget:[['Aménagement des 5 locaux',17000000],['Branchements eau et électricité',3000000],['Frais et assurance',2000000],['Réserve de sécurité',3000000]],
    etapes:[['Mois 1 à 6','Travaux d’aménagement'],['Mois 7 à 8','Signature des baux'],['Mois 9 à 20','Loyers et retours aux investisseurs']],
    rev:'Les revenus attendus viennent des loyers. Ils ne sont pas garantis : un local peut rester vide.',
    docs:[['Carte d’identité de la promotrice',1],['Titre foncier de l’immeuble',1],['Promesses de bail de 3 commerçants',1],['Assurance de l’immeuble',1]]},
  {id:'p5',sec:'Agriculture',nom:'Élevage de volailles, Thiès',lieu:'Thiès',op:'Ferme Thiès Avicole (exemple)',cr:'ousmane',obj:10000000,col:2500000,tk:25000,duree:'10 mois',risque:'Élevé',
    acteur:'une institution de microfinance agréée (exemple)',
    desc:'Ousmane Diallo élève des poulets de chair depuis 8 ans. Le projet finance un second poulailler de 2 000 poulets et l’alimentation des 3 premières bandes, vendues à des restaurateurs et au marché de Thiès.',
    budget:[['Poulailler',4500000],['Poussins',2000000],['Alimentation',2700000],['Vétérinaire',500000],['Réserve de sécurité',300000]],
    etapes:[['Mois 1 à 2','Construction du poulailler'],['Mois 3 à 8','Trois bandes de poulets, 45 jours chacune'],['Mois 9 à 10','Remboursement des investisseurs']],
    rev:'Les revenus attendus viennent de la vente des poulets. Ils ne sont pas garantis : maladie ou hausse du prix de l’aliment.',
    docs:[['Carte d’identité de l’éleveur',1],['Autorisation d’élevage',1],['Contrats avec 2 restaurateurs',0],['Rapport du vétérinaire',1]]}
];
const DESC_DEMO = 'Tontine hebdomadaire de 8 voisines et voisins des Parcelles Assainies. Chaque semaine, tout le monde cotise 5 000 F et une personne reçoit la cagnotte, dans l’ordre du tirage au sort.';
const REGLES = {relance:'Une relance est envoyée après 2 jours de retard.',penalite:'Une pénalité de 500 F est appliquée après 5 jours de retard.',vote:'Le groupe vote la décision à la majorité.'};

/* =====================================================================
   BLOCS D'AFFICHAGE
   ===================================================================== */
const carteCreateur = c => {
  if (!c) return '';
  const nom = [c.p,c.n].filter(Boolean).join(' '), t = (ok,txt) => `<li class="${ok?'':'non'}">${ic(ok?'check':'dash')}<span>${txt}</span></li>`;
  return `<div class="bl"><div class="id-l"><span class="av">${esc(ini(c.p,c.n))}</span><div><b style="font-size:21px">${esc(nom)}</b><div class="fin">${esc([c.age?c.age+' ans':'',c.q].filter(Boolean).join(', '))}</div></div></div>
    ${c.pro?`<p style="margin-top:10px">${esc(c.pro)}</p>`:''}
    <ul class="ck">${t(c.niv>=1,'Numéro de téléphone vérifié par SMS')}${t(c.niv>=2,'Identité vérifiée : carte d’identité et selfie')}${t(c.niv>=3,'Activité vérifiée : justificatif et origine des fonds')}</ul>
    <p class="fin" style="margin-top:10px">${c.dep?'Membre depuis '+esc(c.dep)+'. ':''}${c.niv>=2?'Aucun signalement.':'Identité non vérifiée.'}</p></div>`;
};
const budgetHTML = b => `<div class="tarif">${b.map(([l,m])=>`<div>${esc(l)}</div><div>${F(m)}</div>`).join('')}<div><b>Total</b></div><div>${F(b.reduce((s,x)=>s+x[1],0))}</div></div>`;
const etapesHTML = e => e.map(([q,t],i)=>`<div class="row"><div class="n">${i+1}</div><div class="c">${esc(q)}<small>${esc(t)}</small></div></div>`).join('');
const docsHTML = d => d.map(([l,ok])=>`<div class="row"><div class="n">${ic(ok?'check':'clock','g')}</div><div class="c">${esc(l)}<small>${ok?'Vérifié par TDDK (démonstration)':'En attente de vérification'}</small></div></div>`).join('');
const protection = fonds => `<div class="m"><p>${esc(fonds)}</p><ul class="ck">${SECU.map(s=>`<li>${ic('check')}<span>${s}</span></li>`).join('')}</ul></div>`;
const T2 = (h,x) => `<div class="titre"><h2>${h}</h2></div>${x}`;

function creatorOf(g){
  if (g.createur) return g.createur;
  if (g.nom==='Tontine des Parcelles') return CRE.fatou;
  const a = g.membres.find(m=>m.admin); return a ? {p:a.nom.replace(/^\+221.*/,'Numéro '+a.nom),n:'',niv:1} : null;
}
function aPropos(g){
  const c = creatorOf(g), demo = g.nom==='Tontine des Parcelles' && !g.desc;
  return T2('À propos du groupe', `<div class="m"><p>${esc(g.desc || (demo?DESC_DEMO:'Le créateur n’a pas ajouté de description.'))}</p>
    <p style="margin-top:10px"><b>En cas de retard :</b> ${esc(REGLES[g.regle||'relance'])}</p></div>`)
   + T2('Qui est derrière ce groupe', carteCreateur(c))
   + `<div class="m"><ul class="ck">${SECU.slice(1).map(s=>`<li>${ic('check')}<span>${s}</span></li>`).join('')}</ul>
     <div class="pile"><button class="btn sec petit" data-act="signaler" data-id="${g.id}">Signaler ce groupe</button></div></div>`;
}

/* =====================================================================
   VÉRIFICATION D'IDENTITÉ (assistant)
   Les photos et le numéro de carte restent en mémoire de la page : rien n'est enregistré,
   seuls le nom, le quartier et les 4 derniers chiffres de la carte sont gardés.
   ===================================================================== */
let K = {};
const kEtapes = () => K.mode==='activite' ? ['activite','charte','verif'] : ['intro','id','recto','verso','selfie',...(K.pour==='join'?['activite']:[]),'charte','verif'];
const getf = k => { const u = user(), pref = {prenom:u.prenom,nom:u.nom,adresse:u.quartier}, f = K.f||{}; return f[k] ?? pref[k] ?? ''; };
const choixK = (ch,vals,cur) => `<div class="choix">${vals.map(v=>`<button type="button" data-act="kset" data-ch="${ch}" data-v="${esc(v)}" aria-pressed="${cur===v}">${esc(v)}</button>`).join('')}</div>`;
const inp = (lib,k,extra='',type='text') => `<label class="champ"><span>${lib}</span><input type="${type}" data-kf="${k}" value="${esc(getf(k))}" ${extra}></label>`;
const demoSVG = c => c==='selfie'
  ? '<svg class="dem" viewBox="0 0 320 190" role="img" aria-label="Selfie de démonstration"><circle cx="160" cy="80" r="42" fill="none" stroke="currentColor" stroke-width="4"/><path d="M70 190c8-52 172-52 180 0" fill="none" stroke="currentColor" stroke-width="4"/><text x="160" y="182" text-anchor="middle" font-size="13" fill="currentColor">Photo de démonstration</text></svg>'
  : '<svg class="dem" viewBox="0 0 320 190" role="img" aria-label="Photo de démonstration"><rect x="10" y="10" width="300" height="160" rx="14" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="72" cy="72" r="22" fill="none" stroke="currentColor" stroke-width="4"/><path d="M40 130c6-24 52-24 64 0" fill="none" stroke="currentColor" stroke-width="4"/><path d="M130 55h150M130 85h150M130 115h100" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><text x="160" y="186" text-anchor="middle" font-size="13" fill="currentColor">Photo de démonstration</text></svg>';
function photoBloc(c,titre,aide,cam,checks){
  const v = (K.ph||{})[c];
  const ap = v ? (v==='demo' ? demoSVG(c) : `<img src="${esc(v)}" alt="Aperçu : ${esc(titre)}">`) : `<div style="padding:24px;text-align:center">${ic('camera','g')}<div>Aucune photo</div></div>`;
  return `<div class="champ"><span>${titre}</span><p class="fin">${aide}</p><div class="phv">${ap}</div>
    <div class="pile"><label class="btn sec">${ic('camera')}${v?'Reprendre la photo':'Prendre ou choisir une photo'}<input class="cache" type="file" accept="image/*" capture="${cam}" data-photo="${c}"></label>
    <button class="btn sec petit" data-act="kphoto" data-c="${c}">Utiliser une photo de démonstration</button></div>
    ${v?`<ul class="ck">${checks.map(x=>`<li>${ic('check')}<span>${x}</span></li>`).join('')}</ul><p class="fin">Contrôle automatique simulé.</p>`:''}</div>`;
}
const CHARTE = ['Je confirme que j’ai 18 ans ou plus et que les informations données sont exactes.','Je comprends que TDDK ne détient jamais l’argent du groupe.','J’accepte que les membres voient mon prénom, mon nom, mon quartier et mon badge de vérification, jamais ma carte.','Je m’engage à être transparent avec le groupe et à ne jamais demander d’argent en dehors de l’application.'];
const VITEMS = () => ['Lecture de la carte d’identité','Comparaison du visage avec la photo de la carte','Contrôle de ton numéro de téléphone','Contrôle des informations données',...((K.pour==='join'||K.mode==='activite')?['Contrôle de l’activité et de l’origine des fonds']:[])];

function vKyc(){
  const E = kEtapes(), i = Math.min(K.step||0,E.length-1), e = E[i], u = user(), f = K.f = K.f||{}; K.ph = K.ph||{};
  const suite = lib => `${err()}<div class="pile"><button class="btn" data-act="knext">${ic('envoi')}${lib||'Continuer'}</button></div>`;
  let b = '', t = '';
  if (e==='intro'){
    t = 'On commence par t’expliquer pourquoi et ce qui est partagé.';
    b = `<div class="titre"><h2>Prouve qui tu es</h2></div><div class="m"><p>Pour protéger tous les membres, chaque personne qui crée un groupe doit prouver son identité. Cela prend environ 5 minutes.</p>
      <p style="margin-top:10px"><b>Prépare :</b></p><ul class="ck"><li>${ic('carte')}<span>Ta carte nationale d’identité</span></li><li>${ic('camera')}<span>Un endroit bien éclairé pour le selfie</span></li></ul>
      <div class="qui"><div><b>Les membres voient</b>Ton prénom, ton nom, ton quartier et ton badge « identité vérifiée ».</div><div><b>Personne ne voit</b>Ta carte, ton numéro de carte, tes photos.</div></div>
      <div class="avert" style="margin:14px 0 0"><p><b>Démonstration.</b> Tes photos restent sur cet appareil et ne sont envoyées nulle part. En vrai, la vérification est faite par un prestataire spécialisé et les documents sont chiffrés.</p></div>${suite('Commencer')}</div>`;
  } else if (e==='id'){
    t = 'Écris les informations exactement comme sur ta carte d’identité.';
    b = `<div class="titre"><h2>Tes informations</h2></div><div class="m">${inp('Prénom','prenom','autocomplete="given-name"')}${inp('Nom','nom','autocomplete="family-name"')}
      ${inp('Date de naissance','dn',`max="${ymd(new Date(Date.now()-18*365.25*86400000))}"`,'date')}${inp('Lieu de naissance','lieu')}
      <div class="champ"><span>Quartier où tu habites</span>${choixK('adresse',QUARTIERS,getf('adresse'))}</div>${inp('Profession','pro')}
      ${inp('Numéro de carte d’identité (13 chiffres)','cni','inputmode="numeric" maxlength="13" autocomplete="off"')}
      <p class="fin" style="margin-top:6px">Ce numéro n’est jamais montré aux autres membres. Seuls les 4 derniers chiffres sont gardés sur cet appareil.</p>${suite()}</div>`;
  } else if (e==='recto' || e==='verso'){
    const r = e==='recto';
    t = r ? 'Photographie le devant de ta carte d’identité, à plat, bien éclairé.' : 'Photographie maintenant le dos de ta carte d’identité.';
    b = `<div class="titre"><h2>${r?'Carte d’identité, devant':'Carte d’identité, dos'}</h2></div><div class="m">${photoBloc(e,r?'Devant de la carte':'Dos de la carte','Pose la carte à plat. Les 4 coins doivent être visibles, sans reflet.','environment',['Photo nette','Texte lisible','Les 4 coins sont visibles'])}${suite()}</div>`;
  } else if (e==='selfie'){
    const p = K.pres||0;
    t = 'Prends un selfie, puis fais le test de présence : il prouve que c’est bien toi, en vrai.';
    b = `<div class="titre"><h2>Ton visage</h2></div><div class="m">${photoBloc('selfie','Ton selfie','Visage entier, sans lunettes de soleil ni casquette, bien éclairé.','user',['Visage bien visible','Photo bien éclairée','Visage proche de celui de la carte'])}
      <div class="champ"><span>Test de présence</span>
      <div class="pres ${p===3?'ok':''}" aria-live="polite">${p===0?'Appuie sur le bouton, puis suis les consignes.':p===1?'Tourne lentement la tête vers la gauche…':p===2?'Cligne des yeux deux fois…':'Test de présence réussi'}</div>
      <div class="pile"><button class="btn sec" data-act="kpres" ${p===1||p===2?'disabled':''}>${ic('visage')}${p===3?'Refaire le test':'Lancer le test de présence'}</button></div></div>${suite()}</div>`;
  } else if (e==='activite'){
    const dom = (K.mode==='activite');
    t = 'Pour protéger les membres, on te demande ton activité et d’où vient l’argent.';
    b = `<div class="titre"><h2>Activité et origine des fonds</h2></div><div class="m">
      <div class="champ"><span>D’où vient l’argent que tu mets dans le groupe ?</span>${choixK('source',['Salaire','Commerce ou activité','Épargne','Aide familiale','Autre'],getf('source'))}</div>
      ${inp('Décris ton activité','activite','maxlength="80"')}${inp('NINEA ou registre du commerce (facultatif)','ninea','maxlength="20"')}
      ${dom?photoBloc('domicile','Justificatif de domicile','Une facture d’eau ou d’électricité à ton nom, de moins de 3 mois.','environment',['Nom lisible','Adresse lisible','Date récente']):''}${suite()}</div>`;
  } else if (e==='charte'){
    const L = CHARTE;
    t = 'Lis chaque engagement et coche-le.';
    b = `<div class="titre"><h2>Mes engagements</h2></div><div class="m"><div class="pile" style="margin-top:0">${L.map((x,j)=>`<button class="bascule" data-act="kch" data-i="${j}" aria-pressed="${!!(K.ch||{})[j]}">${(K.ch||{})[j]?ic('check'):ic('dash')}${x}</button>`).join('')}</div>${suite('Lancer la vérification')}</div>`;
  } else {
    const items = VITEMS(), v = K.v||0, ok = K.fini;
    t = ok ? 'Vérification terminée. Ton identité est vérifiée.' : 'Vérification en cours. Ne ferme pas la page.';
    b = `<div class="titre"><h2>${ok?'Identité vérifiée':'Vérification en cours'}</h2></div>
      ${items.map((x,j)=>`<div class="row"><div class="n">${ic(j<v?'check':'clock','g')}</div><div class="c">${x}<small>${j<v?'Terminé':'En cours'}</small></div></div>`).join('')}
      ${ok?`<div class="m"><div class="pres ok" style="margin-top:20px">${ic('check')} ${NIV[user().kyc.niv]}</div><p class="fin" style="margin-top:10px">Référence ${esc(user().kyc.ref)}, ${esc(user().kyc.date)}. Tu peux consulter ou supprimer tes données dans Plus, Vérification d’identité.</p>
      <div class="pile"><button class="btn" data-act="kfin">${ic('envoi')}Continuer</button></div></div>`:''}`;
  }
  LECT = t;
  return `<div class="col">${haut('Vérification d’identité',`Étape ${i+1} sur ${E.length}`,(i>0&&e!=='verif')?'data-act="kprev"':'data-act="kcancel"')}${b}</div>`;
}
function lancerVerif(){
  K.v = 0; K.fini = false; const n = VITEMS().length;
  const iv = setInterval(() => {
    if (!(S.sous && S.sous.k==='kyc')){ clearInterval(iv); return; }
    K.v++; if (K.v>=n){ clearInterval(iv); finaliser(); } render();
  }, 900);
}
function finaliser(){
  const u = user(), ancien = u.kyc || {}, niv = (K.pour==='join' || K.mode==='activite' || ancien.niv>=3) ? 3 : 2;
  const cni = getf('cni').replace(/\D/g,'');
  u.kyc = Object.assign({}, ancien, K.mode==='activite' ? {} : {prenom:getf('prenom').trim(),nom:getf('nom').trim(),dn:getf('dn'),lieu:getf('lieu').trim(),adresse:getf('adresse'),pro:getf('pro').trim(),cni:'•••••••••'+cni.slice(-4)},
    niv===3 ? {source:getf('source'),activite:getf('activite').trim()} : {}, {niv,date:auj(),ref:'KYC-'+Math.floor(100000+Math.random()*900000)});
  K.fini = true; K.ph = {}; K.f = {};
}
function demarrerKyc(pour,next,mode){
  K = {step:0,pour,next:next||null,mode:mode||'full',f:{},ph:{},ch:{},pres:0};
  S.sous = {o:S.onglet,k:'kyc'}; S.erreur = '';
}

/* ----- Actions de l'assistant ----- */
Object.assign(ACT, {
  kset:a => { (K.f = K.f||{})[a.dataset.ch] = a.dataset.v; },
  kphoto:a => { (K.ph = K.ph||{})[a.dataset.c] = 'demo'; },
  kch:a => { K.ch = K.ch||{}; K.ch[a.dataset.i] = !K.ch[a.dataset.i]; },
  kpres:() => { K.pres = 1; setTimeout(()=>{ K.pres = 2; render(); },1800); setTimeout(()=>{ K.pres = 3; render(); },3600); },
  kprev:() => { K.step = Math.max(0,(K.step||0)-1); S.erreur = ''; },
  kcancel:() => { S.sous = null; K = {}; },
  knext:() => {
    const E = kEtapes(), e = E[K.step||0]; K.ph = K.ph||{}; K.ch = K.ch||{};
    if (e==='id'){
      if (!getf('prenom').trim() || !getf('nom').trim()) return 'Écris ton prénom et ton nom, comme sur ta carte.';
      if (!getf('dn')) return 'Choisis ta date de naissance.';
      if (age(getf('dn'))<18) return 'Il faut avoir 18 ans ou plus pour créer un groupe.';
      if (!getf('lieu').trim()) return 'Écris ton lieu de naissance.';
      if (!getf('adresse')) return 'Choisis ton quartier.';
      if (!getf('pro').trim()) return 'Écris ta profession.';
      if (getf('cni').replace(/\D/g,'').length!==13) return 'Le numéro de carte fait 13 chiffres.';
    } else if (e==='recto' && !K.ph.recto) return 'Ajoute la photo du devant de ta carte.';
    else if (e==='verso' && !K.ph.verso) return 'Ajoute la photo du dos de ta carte.';
    else if (e==='selfie'){ if (!K.ph.selfie) return 'Ajoute ton selfie.'; if (K.pres!==3) return 'Fais d’abord le test de présence.'; }
    else if (e==='activite'){
      if (!getf('source')) return 'Choisis d’où vient l’argent.';
      if (getf('activite').trim().length<3) return 'Décris ton activité en quelques mots.';
      if (K.mode==='activite' && !K.ph.domicile) return 'Ajoute un justificatif de domicile.';
    } else if (e==='charte'){
      const n = CHARTE.length;
      for (let j=0;j<n;j++) if (!K.ch[j]) return 'Coche tous les engagements pour continuer.';
    }
    K.step = (K.step||0)+1; S.erreur = '';
    if (kEtapes()[K.step]==='verif') lancerVerif();
  },
  kfin:() => {
    const p = K.pour, next = K.next; K = {};
    if (p==='tontine'){ S.sous = null; return ACT_CREER({dataset:{t:p}}); }
    if (next){ S.sous = next; S.onglet = next.o; return; }
    S.sous = null; S.onglet = 'plus';
  }
});
document.addEventListener('input', e => {
  const k = e.target.dataset && e.target.dataset.kf; if (!k) return;
  K.f = K.f||{}; K.f[k] = k==='cni' ? e.target.value.replace(/\D/g,'').slice(0,13) : e.target.value;
  if (k==='cni') e.target.value = K.f[k];
});
document.addEventListener('change', e => {
  const c = e.target.dataset && e.target.dataset.photo, f = c && e.target.files && e.target.files[0]; if (!f) return;
  K.ph = K.ph||{}; K.ph[c] = URL.createObjectURL(f); render();
});

/* =====================================================================
   VÉRIFICATION OBLIGATOIRE : création de groupe et demandes pour rejoindre
   ===================================================================== */
const ACT_CREER = ACT.creer;
ACT.creer = a => {
  const u = user();
  if (!u.premium && D().groupes.length>=LIM.tontines) return ACT_CREER(a);
  if (!u.kyc) return demarrerKyc('tontine',null,'full');
  return ACT_CREER(a);
};
ACT.miseRel = a => {
  const u = user(), p = PR.find(x=>x.id===a.dataset.id); if (!p) return;
  if (!u.premium) return premium('Investir dans un projet :');
  if (!u.kyc) return demarrerKyc('join',{o:'invest',k:'fprojet',id:p.id},'full');
  ext().mises.push({id:p.id,nom:p.nom,mise:parseInt(S.tmp.mise||p.tk,10),d:auj(),acteur:p.acteur});
  toast('Demande envoyée. TDDK ne prélève aucun argent : la suite se fait avec l’acteur autorisé.');
};
const ACT_SOUS = ACT.sous;
ACT.sous = function(a){
  if (a.dataset.k==='projet'){ S.sous = {o:'invest',k:'fprojet',id:a.dataset.id}; S.onglet = 'invest'; S.tmp.mise = ''; S.tmp.risque = false; S.erreur = ''; window.scrollTo(0,0); return; }
  return ACT_SOUS(a);
};
['accepter','refuser'].forEach(k => { const o = ACT[k]; ACT[k] = a => { const r = o(a); S.sous = null; return r; }; });
const ACT_DECO = ACT.deco; ACT.deco = a => { S.sous = null; K = {}; return ACT_DECO(a); };

/* ----- Création de groupe : champs de sécurité supplémentaires ----- */
const _vCreer = vCreer;
vCreer = function(){
  const h = _vCreer(), T = S.tmp, k = user().kyc;
  const extra = `${k?`<div class="bl" style="margin:20px 0 0"><div class="id-l"><span class="av">${esc(ini(k.prenom,k.nom))}</span><div><b>${esc(k.prenom)} ${esc(k.nom)}</b><div class="fin">Créateur du groupe</div></div></div><p style="margin-top:8px">${badge(k.niv)}</p><p class="fin" style="margin-top:6px">Les membres verront ton nom, ton quartier et ce badge.</p></div>`:''}
    <label class="champ"><span>À quoi sert ce groupe ? Qui peut le rejoindre ?</span><textarea data-f="g_desc" maxlength="500">${esc(T.g_desc||'')}</textarea></label>
    <div class="champ"><span>En cas de retard de paiement</span>${choix('g_regle',[['relance','Relance après 2 jours'],['penalite','Pénalité de 500 F'],['vote','Vote du groupe']],T.g_regle||'relance')}</div>`;
  const marque = '<p class="err" role="alert">';
  return h.includes(marque) ? h.replace(marque, extra + marque) : h;
};
const ACT_VAL = ACT.valcreer;
ACT.valcreer = a => {
  const T = Object.assign({}, S.tmp), u = user();
  if ((T.g_desc||'').trim().length<20) return 'Décris le groupe en au moins 20 caractères.';
  const r = ACT_VAL(a); if (typeof r==='string') return r;
  const g = D().groupes.find(x=>x.id===S.gid);
  if (g && u.kyc) Object.assign(g, {desc:T.g_desc.trim(),regle:T.g_regle||'relance',createur:{p:u.kyc.prenom,n:u.kyc.nom,q:u.kyc.adresse,pro:u.kyc.pro,niv:u.kyc.niv,dep:'aujourd’hui'}});
  return r;
};
ACT.signaler = a => { const d = D(); (d.sig = d.sig||[]).push({id:a.dataset.id,d:auj()}); toast('Signalement enregistré (démo). Une personne de TDDK examine la situation.'); };

/* ----- Fiche du groupe dans l'écran du groupe, et fiche d'invitation ----- */
const _vGroupe = vGroupe;
vGroupe = function(){
  const h = _vGroupe(), g = G(), m = '<div class="titre"><h2>Qui a payé</h2></div>';
  return g && h.includes(m) ? h.replace(m, aPropos(g) + m) : h;
};
const _vListe = vListe;
vListe = function(){
  return _vListe().replace(/<div class="duo2"><button class="btn" data-act="accepter" data-i="([^"]+)">/g,
    (m,id) => `<button class="btn sec petit" data-act="finv" data-i="${id}" style="margin-top:12px">${ic('user')}Voir le créateur et les règles</button>` + m);
};
ACT.finv = a => { S.sous = {o:'tontines',k:'finv',id:a.dataset.i}; S.vue = 'liste'; S.onglet = 'tontines'; window.scrollTo(0,0); };
function vFinv(s){
  const i = D().invits.find(x=>x.id===s.id); if (!i){ S.sous = null; return null; }
  let c = i.demo ? CRE.fatou : null;
  if (!c){ const co = Object.values(S.comptes).find(x=>x.prenom===i.de); c = co && co.kyc ? {p:co.kyc.prenom,n:co.kyc.nom,q:co.kyc.adresse,pro:co.kyc.pro,niv:co.kyc.niv} : {p:i.de,n:'',niv:1}; }
  LECT = `${i.nom}. Invitation de ${c.p}. ${c.niv>=2?'Son identité est vérifiée.':'Son identité n’est pas vérifiée.'}`;
  return `<div class="col">${haut(i.nom,'Invitation',ret('','tontines'))}
    ${T2('À propos du groupe',`<div class="m"><p>${esc(i.demo?DESC_DEMO:'Le créateur n’a pas ajouté de description.')}</p><p style="margin-top:10px"><b>Cotisation :</b> ${F(i.montant)} ${FREQ[i.freq]}, ${i.n} personnes.</p>
      <p style="margin-top:8px"><b>En cas de retard :</b> ${esc(REGLES.relance)}</p><p class="fin" style="margin-top:8px">Commission TDDK : ${F(comm(i.n))} par membre, payée une seule fois.</p></div>`)}
    ${T2('Qui t’invite',carteCreateur(c))}
    <div class="m"><ul class="ck">${SECU.slice(1).map(x=>`<li>${ic('check')}<span>${x}</span></li>`).join('')}</ul>
      <div class="duo2"><button class="btn" data-act="accepter" data-i="${i.id}">${ic('check')}Accepter</button><button class="btn sec" data-act="refuser" data-i="${i.id}">${ic('cross')}Refuser</button></div></div></div>`;
}

/* =====================================================================
   ONGLET INVESTIR : projets d'investissement
   ===================================================================== */
vInvest = function(){
  const x = ext(), mk = S.tmp.mk || 'tous';
  LECT = 'Investir. Voici des projets d’investissement. Ouvre un projet pour voir qui le porte, à quoi servira l’argent et les étapes.';
  const L = PR.filter(p => mk==='tous' || p.sec===mk);
  const cartes = L.map(p => { const c = CRE[p.cr], dem = x.mises.some(d=>d.id===p.id);
    return `<div class="bl"><div class="tags"><span class="tag">${esc(p.sec)}</span><span class="tag">${esc(p.lieu)}</span><span class="tag">${esc(p.duree)}</span></div>
      <h2>${esc(p.nom)}</h2>
      <div class="id-l" style="margin:8px 0 10px"><span class="av" style="width:44px;height:44px;font-size:16px">${esc(ini(c.p,c.n))}</span><div><b>${esc(c.p+' '+c.n)}</b><div style="margin-top:4px">${badge(c.niv)}</div></div></div>
      <div class="jauge" role="img" aria-label="${pour(p.col,p.obj)} pour cent collectés"><i style="width:${pour(p.col,p.obj)}%"></i></div>
      <p class="fin">${F(p.col)} sur ${F(p.obj)}. Mise minimale ${F(p.tk)}.</p>
      <div class="pile" style="margin-top:12px"><button class="btn sec" data-act="sous" data-k="projet" data-o="invest" data-id="${p.id}">${ic('envoi')}${dem?'Demande envoyée, voir le projet':'Voir le projet'}</button></div></div>`; }).join('');
  return `<div class="col">${haut('Investir','Projets d’investissement')}
    <div class="m"><div class="champ" style="margin-top:16px"><span>Secteur</span>${choix('mk',[['tous','Tous'],['Immobilier','Immobilier'],['Entrepreneuriat','Entrepreneuriat'],['Agriculture','Agriculture']],mk)}</div></div>
    ${cartes || '<p class="m">Aucun projet dans ce secteur.</p>'}</div>`;
};
function vFProjet(s){
  const p = PR.find(x=>x.id===s.id); if (!p){ S.sous = null; return null; }
  const c = CRE[p.cr], deja = D().ext && D().ext.mises.some(d=>d.id===p.id), mise = S.tmp.mise || String(p.tk);
  LECT = `${p.nom}. Dirigé par ${c.p} ${c.n}, identité et activité vérifiées. Les fonds passent par ${p.acteur}, pas par TDDK.`;
  const cta = deja ? `<button class="btn" disabled>${ic('check')}Demande de mise en relation envoyée</button>`
    : `<div class="champ" style="margin-top:0"><span>Ma mise envisagée</span>${choix('mise',[1,2,5].map(k=>[String(p.tk*k),F(p.tk*k)]),mise)}</div>
       <button class="btn" data-act="miseRel" data-id="${p.id}">${user().premium?ic('envoi'):ic('cadenas')}Demander la mise en relation</button>`;
  return `<div class="col">${haut(p.nom,p.sec,ret('','invest'))}
    <section class="bl"><div class="tags"><span class="tag">${esc(p.lieu)}</span><span class="tag">${esc(p.duree)}</span></div><p>${esc(p.desc)}</p>
      <div class="jauge" role="img" aria-label="${pour(p.col,p.obj)} pour cent collectés"><i style="width:${pour(p.col,p.obj)}%"></i></div>
      <p class="fin">${F(p.col)} sur ${F(p.obj)}. Mise minimale ${F(p.tk)}.</p></section>
    ${T2('Le dirigeant',carteCreateur(c))}
    ${T2('L’entreprise',`<div class="row"><div class="n">${ic('carte','g')}</div><div class="c">${esc(p.op)}<small>Contrôlée par TDDK (démonstration)</small></div><div class="d">${badge(3)}</div></div>`)}
    ${T2('À quoi servira l’argent',`<div class="m">${budgetHTML(p.budget)}</div>`)}${T2('Les étapes',etapesHTML(p.etapes))}
    ${T2('D’où viendront les revenus',`<div class="m"><p>${esc(p.rev)}</p></div>`)}${T2('Documents',docsHTML(p.docs))}
    ${T2('Qui détient l’argent',protection('Les fonds sont collectés et reversés par '+p.acteur+'. TDDK met en relation, il ne touche à aucun fonds.'))}
    <div class="m"><div class="pile">${cta}<button class="btn sec petit" data-act="signaler" data-id="${p.id}">Signaler ce projet</button></div></div></div>`;
}

/* =====================================================================
   PLUS : vérification d'identité (statut, consultation, suppression)
   ===================================================================== */
const rowKyc = () => { const k = user().kyc;
  return `<button class="row lien" data-act="kycvoir"><div class="n">${ic('carte','g')}</div><div class="c">Vérification d’identité<small>${k?'Vérifiée le '+esc(k.date):'Nécessaire pour créer un groupe'}</small></div><div class="d">${k?badge(k.niv):'<span class="st attente">À faire</span>'}${ic('chevron')}</div></button>`; };
ACT.kycvoir = () => { if (user().kyc){ S.sous = {o:'plus',k:'kycinfo'}; S.onglet = 'plus'; window.scrollTo(0,0); } else demarrerKyc('plus',null,'full'); };
ACT.kycdel = () => { if (!confirm('Supprimer tes données de vérification ? Tu ne pourras plus créer de groupe sans refaire la vérification.')) return; delete user().kyc; S.sous = null; toast('Données de vérification supprimées.'); };
function vKycInfo(){
  const k = user().kyc; if (!k){ S.sous = null; return null; }
  LECT = `Ton identité est vérifiée, niveau ${k.niv}. Tu peux supprimer tes données quand tu veux.`;
  const L = (a,b) => `<div class="row"><div class="c" style="grid-column:1/3;padding-left:16px">${a}<small>${esc(b)}</small></div></div>`;
  return `<div class="col">${haut('Vérification d’identité',NIV[k.niv],ret('','plus'))}
    <div class="m"><div class="pres ok" style="margin-top:20px">${ic('check')} ${NIV[k.niv]}</div></div>
    ${T2('Ce qui est gardé sur cet appareil',L('Nom',k.prenom+' '+k.nom)+L('Né(e) le',k.dn+', '+k.lieu)+L('Quartier',k.adresse)+L('Profession',k.pro)+L('Carte d’identité',k.cni)+L('Référence',k.ref+', '+k.date))}
    <div class="m"><p class="fin" style="margin-top:10px">Les photos ne sont pas gardées. Les autres membres voient seulement ton nom, ton quartier et ton badge.</p>
      <div class="pile">${k.niv<3?`<button class="btn sec" data-act="kycniv3">Ajouter la vérification de l’activité</button>`:''}<button class="btn sec" data-act="kycdel">${ic('eff')}Supprimer mes données de vérification</button></div></div></div>`;
}
ACT.kycniv3 = () => demarrerKyc('plus',null,'activite');

/* ----- Branchement dans l'application ----- */
const MES = {kyc:vKyc, finv:vFinv, fprojet:vFProjet, kycinfo:vKycInfo};
const _vApp = vApp;
vApp = function(){
  if (!user()) return _vApp();
  const s = S.sous;
  if (s && MES[s.k]){
    const base = _vApp(), i = base.indexOf('<nav class="tabs"'), tabs = i>=0 ? base.slice(i) : '', h = MES[s.k](s);
    if (h) return h + tabs;
  }
  let out = _vApp();
  if (S.onglet==='plus' && !S.sous){ const m = '<div class="titre"><h2>Mon espace</h2></div>'; if (out.includes(m)) out = out.replace(m, m + rowKyc()); }
  return out;
};

render();
})();
