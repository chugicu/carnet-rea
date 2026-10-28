// Écrans d'authentification : connexion, inscription, mot de passe oublié, changement obligatoire
import { h, clear, icon } from '../util.js';
import { field, textInput, selectInput, checkbox } from '../ui.js';
import { login, register, forgot, resetPw, changePw, S, logout, NetError, meNow, saveUser, cfg } from '../store.js';
import { photoField, savePhoto } from '../photo.js';
import { pubInfo, refreshPub, appName, appLogo } from '../nav.js';
import { etabServiceField } from './etab-service.js';

function pwField(label, o = {}) {
  const inp = textInput({ type: 'password', autocomplete: o.autocomplete || 'current-password', placeholder: o.placeholder, name: o.name });
  const eye = h('button', { type: 'button', class: 'iconbtn', 'aria-label': 'Afficher le mot de passe', onclick: () => { inp.type = inp.type === 'password' ? 'text' : 'password'; } }, icon('eye', 18));
  const wrap = h('div', { class: 'row' }, h('div', { class: 'grow' }, inp), eye);
  const f = field(label, wrap, o.hint);
  f.input = inp;
  return f;
}
function errBox() { return h('div', { class: 'err', role: 'alert', hidden: true }); }
function showErr(box, msg) { box.textContent = msg; box.hidden = !msg; }

export function renderAuth(root, mode = 'login') {
  let pub = pubInfo();
  const st = { mode, username: '', info: '' };
  // réglages publics à jour (DES, notice, établissements…) : le cache d'un téléphone neuf est vide
  refreshPub().then(ok => { if (ok && root.isConnected && !root.querySelector('input:focus')) { pub = pubInfo(); draw(); } });

  function frame(title, sub, ...kids) {
    return h('div', { class: 'auth' }, h('div', { class: 'auth-box' },
      h('div', { class: 'auth-logo' }, h('img', { src: appLogo(), alt: '' }), h('div', { class: 't' }, appName()), h('div', { class: 's' }, pubInfo().app.service || '')),
      h('div', { class: 'grad-line' }),
      title ? h('h1', { class: 'h3' }, title) : null,
      sub ? h('p', { class: 'soft small' }, sub) : null,
      ...kids));
  }
  function submitBtn(label) { return h('button', { class: 'btn primary block', type: 'submit' }, label); }
  function link(label, m) { return h('button', { class: 'linkbtn', type: 'button', onclick: () => { st.mode = m; draw(); } }, label); }

  function loginView() {
    const u = textInput({ placeholder: 'prenom.nom', autocomplete: 'username', autocapitalize: 'none', spellcheck: false, value: st.username, name: 'username' });
    const p = pwField('Mot de passe', { name: 'password' });
    const err = errBox();
    const form = h('form', { class: 'col', novalidate: true }, field('Identifiant', u), p, err, submitBtn('Se connecter'));
    if (S.notice) form.prepend(h('div', { class: 'banner' }, icon('info', 18), h('span', null, S.notice)));
    form.addEventListener('submit', async e => {
      e.preventDefault();
      showErr(err, '');
      const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
      try { st.username = u.value; await login(u.value.trim(), p.input.value); }
      catch (ex) { showErr(err, ex instanceof NetError ? 'Connexion impossible : vérifie ta connexion Internet.' : ex.message); btn.disabled = false; }
    });
    return frame(null, null, form,
      h('div', { class: 'row between wrap' }, link('Mot de passe oublié ?', 'forgot'), pub.inscription ? link('Créer mon compte', 'register') : null));
  }

  function registerView() {
    const prenom = textInput({ autocomplete: 'given-name', max: 60 });
    const nom = textInput({ autocomplete: 'family-name', max: 60 });
    const email = textInput({ type: 'email', autocomplete: 'email', autocapitalize: 'none', max: 120 });
    const spec = selectInput([{ v: '', label: 'Choisir…' }].concat(pub.specialites.map(s => ({ v: s, label: s }))), '');
    const rang = selectInput([{ v: '', label: 'Choisir…' }].concat(Array.from({ length: 12 }, (_, i) => ({ v: i + 1, label: 'Semestre ' + (i + 1) }))), '');
    const p1 = pwField('Mot de passe', { autocomplete: 'new-password', hint: pub.mdpMin + ' caractères minimum.' });
    const es = etabServiceField(pub.echo, {});
    const acc = checkbox("J'ai lu la notice d'information ci-dessous et je l'accepte.", false);
    const err = errBox();
    const form = h('form', { class: 'col', novalidate: true },
      h('div', { class: 'row' }, h('div', { class: 'grow' }, field('Prénom', prenom)), h('div', { class: 'grow' }, field('Nom', nom))),
      field('E-mail', email, 'Sert uniquement à réinitialiser ton mot de passe.'),
      field('DES d’origine', spec), field('Semestre de DES en cours', rang, 'Visibles de l’équipe pédagogique et des seniors.'), es.nodes, p1,
      h('details', { class: 'card small' }, h('summary', { style: { fontWeight: 600, cursor: 'pointer' } }, "Notice d'information (données personnelles)"), h('p', { class: 'soft mt-s' }, pub.rgpd)),
      acc, err, submitBtn('Créer mon compte'));
    form.addEventListener('submit', async e => {
      e.preventDefault(); showErr(err, '');
      if (!spec.value) { showErr(err, 'Choisis ton DES d’origine.'); return; }
      if (!rang.value) { showErr(err, 'Choisis ton semestre de DES.'); return; }
      if (es.active && !es.etab.value) { showErr(err, 'Choisis ton établissement.'); return; }
      if (es.active && !es.service.value) { showErr(err, 'Choisis ton service.'); return; }
      if (!acc.input.checked) { showErr(err, "Coche la case pour accepter la notice d'information."); return; }
      const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
      try { await register({ prenom: prenom.value, nom: nom.value, email: email.value, specialite: spec.value, rang: rang.value, etab: es.active ? es.etab.value : '', service: es.active ? es.service.value : '', password: p1.input.value, accept: true }); }
      catch (ex) { showErr(err, ex instanceof NetError ? 'Connexion impossible : vérifie ta connexion Internet.' : ex.message); btn.disabled = false; }
    });
    return frame('Créer mon compte', 'Ton identifiant sera de la forme prenom.nom.', form, link('← Retour à la connexion', 'login'));
  }

  function forgotView() {
    const u = textInput({ placeholder: 'prenom.nom ou e-mail', autocapitalize: 'none', value: st.username });
    const err = errBox();
    const form = h('form', { class: 'col', novalidate: true }, field('Identifiant ou e-mail', u), err, submitBtn('Recevoir un code par e-mail'));
    form.addEventListener('submit', async e => {
      e.preventDefault(); showErr(err, '');
      const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
      try { st.username = u.value.trim(); const r = await forgot(st.username); st.info = r.message; st.mode = 'reset'; draw(); }
      catch (ex) { showErr(err, ex instanceof NetError ? 'Connexion impossible : vérifie ta connexion Internet.' : ex.message); btn.disabled = false; }
    });
    return frame('Mot de passe oublié', 'Un code valable 30 minutes t’est envoyé par e-mail.', form, link('← Retour à la connexion', 'login'));
  }

  function resetView() {
    const u = textInput({ value: st.username, autocapitalize: 'none' });
    const code = textInput({ placeholder: 'XXXXXXXX', autocapitalize: 'characters', autocomplete: 'one-time-code', max: 12 });
    const p = pwField('Nouveau mot de passe', { autocomplete: 'new-password' });
    const err = errBox();
    const form = h('form', { class: 'col', novalidate: true }, field('Identifiant ou e-mail', u), field('Code reçu par e-mail', code), p, err, submitBtn('Changer mon mot de passe'));
    form.addEventListener('submit', async e => {
      e.preventDefault(); showErr(err, '');
      const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
      try { await resetPw(u.value.trim(), code.value, p.input.value); st.username = u.value.trim(); S.notice = 'Mot de passe modifié : connecte-toi.'; st.mode = 'login'; draw(); }
      catch (ex) { showErr(err, ex instanceof NetError ? 'Connexion impossible : vérifie ta connexion Internet.' : ex.message); btn.disabled = false; }
    });
    return frame('Nouveau mot de passe', st.info || null, form, link('← Retour à la connexion', 'login'));
  }

  function draw() {
    clear(root);
    root.append(st.mode === 'register' ? registerView() : st.mode === 'forgot' ? forgotView() : st.mode === 'reset' ? resetView() : loginView());
    if (st.mode === 'login') S.notice = S.notice; // conservé jusqu'à la prochaine connexion
  }
  draw();
}

export function renderMustChange(root) {
  clear(root);
  const old = pwField('Mot de passe provisoire (celui reçu)', { name: 'old' });
  const p1 = pwField('Nouveau mot de passe', { autocomplete: 'new-password', hint: '8 caractères minimum.' });
  const p2 = pwField('Confirmer le nouveau mot de passe', { autocomplete: 'new-password' });
  const err = errBox();
  const form = h('form', { class: 'col', novalidate: true }, old, p1, p2, err, h('button', { class: 'btn primary block', type: 'submit' }, 'Enregistrer'));
  form.addEventListener('submit', async e => {
    e.preventDefault(); showErr(err, '');
    if (p1.input.value !== p2.input.value) { showErr(err, 'Les deux mots de passe ne sont pas identiques.'); return; }
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
    try { await changePw(old.input.value, p1.input.value); }
    catch (ex) { showErr(err, ex instanceof NetError ? 'Connexion impossible : vérifie ta connexion Internet.' : ex.message); btn.disabled = false; }
  });
  root.append(h('div', { class: 'auth' }, h('div', { class: 'auth-box' },
    h('div', { class: 'auth-logo' }, h('img', { src: appLogo(), alt: '' }), h('div', { class: 't' }, appName())),
    h('div', { class: 'grad-line' }),
    h('h1', { class: 'h3' }, 'Choisis ton mot de passe'),
    h('p', { class: 'soft small' }, 'Ton compte a été créé avec un mot de passe provisoire. Choisis-en un personnel pour continuer.'),
    form,
    h('button', { class: 'linkbtn', type: 'button', onclick: () => logout() }, 'Se déconnecter'))));
}

/** Écran bloquant à la première connexion d'un interne : DES d'origine + semestre de DES (obligatoires), photo (facultative) */
export function renderProfileGate(root) {
  clear(root);
  const me = meNow();
  const specs = cfg('specialites') || [];
  const spec = selectInput([{ v: '', label: 'Choisir…' }].concat(specs.map(s => ({ v: s, label: s }))), me.specialite || '');
  const rang = selectInput([{ v: '', label: 'Choisir…' }].concat(Array.from({ length: 12 }, (_, i) => ({ v: i + 1, label: 'Semestre ' + (i + 1) }))), me.rang || '');
  const photo = photoField(me);
  const err = errBox();
  const form = h('form', { class: 'col', novalidate: true },
    field('DES d’origine', spec),
    field('Semestre de DES en cours', rang),
    field('Photo (facultative)', photo, 'Aide l’équipe et les seniors à te reconnaître.'),
    err, h('button', { class: 'btn primary block', type: 'submit' }, 'Continuer'));
  form.addEventListener('submit', e => {
    e.preventDefault(); showErr(err, '');
    if (!spec.value) { showErr(err, 'Choisis ton DES d’origine.'); return; }
    if (!rang.value) { showErr(err, 'Choisis ton semestre de DES.'); return; }
    savePhoto(me, photo);
    saveUser(me, { specialite: spec.value, rang: Number(rang.value) });
  });
  root.append(h('div', { class: 'auth', id: 'gate' }, h('div', { class: 'auth-box' },
    h('div', { class: 'auth-logo' }, h('img', { src: appLogo(), alt: '' }), h('div', { class: 't' }, appName())),
    h('div', { class: 'grad-line' }),
    h('h1', { class: 'h3' }, 'Complète ton profil'),
    h('p', { class: 'soft small' }, 'Bienvenue ' + (me.prenom || '') + ' ! Ces informations sont visibles de l’équipe pédagogique et des seniors du service. Tu pourras les modifier à tout moment dans Moi → Mon profil.'),
    form,
    h('button', { class: 'linkbtn', type: 'button', onclick: () => logout() }, 'Se déconnecter'))));
}
