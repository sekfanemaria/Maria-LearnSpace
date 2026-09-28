// ===== À MODIFIER =====
const CONFIG = {
  whatsapp: "213798443828",          // votre numéro, format international sans + ni espaces
  email: "sekfanemaria2004@email.com",
  sheetUrl: "https://script.google.com/macros/s/AKfycbyr2ww3CrHaXONKSzCgvP-oRLdo2v0oXGimJgSCvxiahadwv1RBvSuAgkWijgh31JeQ/exec", // voir apps-script.gs
  discount: 0.20,                    // 20 % si les 3 formations
  courses: {
    word:       { name: "Word",       price: 6000 },
    excel:      { name: "Excel",      price: 9000 },
    powerpoint: { name: "PowerPoint", price: 6000 }
  }
};
// ======================
 
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = n => n.toLocaleString("fr-FR") + " DA";
const form = $("#form");
const checks = $$('input[name="course"]');
 
// Liens de contact, prix, année (toutes les pages)
const waLink = txt => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(txt)}`;
$$("[data-wa]").forEach(a => a.href = waLink("Bonjour, je souhaite des informations sur vos formations."));
$$("[data-mail]").forEach(a => a.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent("Question sur les formations")}`);
$$("[data-price]").forEach(e => e.textContent = money(CONFIG.courses[e.dataset.price].price));
$$("[data-discount]").forEach(e => e.textContent = Math.round(CONFIG.discount * 100) + " %");
$("#year").textContent = new Date().getFullYear();
 
// Menu téléphone
const burger = $("#burger"), menu = $("#menu");
burger.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  burger.setAttribute("aria-expanded", open);
});
 
// Page Inscription et paiement uniquement
if (form) {
  function compute() {
    const chosen = checks.filter(c => c.checked).map(c => c.value);
    const sub = chosen.reduce((s, k) => s + CONFIG.courses[k].price, 0);
    const all = chosen.length === 3;
    const rem = all ? Math.round(sub * CONFIG.discount) : 0;
    $("#sub").textContent = money(sub);
    $("#rem").textContent = rem ? "-" + money(rem) : "0 DA";
    $("#tot").textContent = money(sub - rem);
    $("#hint").textContent = all ? "Remise pack appliquée." : "Ajoutez les trois formations pour obtenir la remise.";
    return { chosen, sub, rem, total: sub - rem };
  }
  checks.forEach(c => c.addEventListener("change", compute));
 
  // Formation choisie depuis la page Formations (?course=word)
  const pre = new URLSearchParams(location.search).get("course");
  const box = pre && $(`input[value="${pre}"]`);
  if (box) box.checked = true;
 
  // Préremplissage pour les clients déjà venus (mémorisé dans leur navigateur)
  const FIELDS = ["prenom", "nom", "telephone", "email"];
  try {
    const saved = JSON.parse(localStorage.getItem("client") || "{}");
    FIELDS.forEach(f => { if (saved[f]) form.elements[f].value = saved[f]; });
  } catch (e) {}
 
  // Envoi vers Google Sheet
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const msg = $("#msg");
    $$("input,select", form).forEach(i => i.classList.add("touched"));
    const { chosen, sub, rem, total } = compute();
    if (!form.checkValidity() || !chosen.length) {
      msg.className = "err";
      msg.textContent = chosen.length ? "Complétez les champs en rouge." : "Choisissez au moins une formation.";
      return;
    }
    const d = Object.fromEntries(new FormData(form));
    const data = {
      prenom: d.prenom.trim(), nom: d.nom.trim(),
      telephone: d.telephone.trim(), email: d.email.trim(),
      formations: chosen.map(k => CONFIG.courses[k].name).join(", "),
      paiement: d.paiement, sousTotal: sub, remise: rem, total
    };
    try { localStorage.setItem("client", JSON.stringify(Object.fromEntries(FIELDS.map(f => [f, data[f]])))); } catch (e) {}
    if (CONFIG.sheetUrl.startsWith("COLLER")) {
      msg.className = "err";
      msg.textContent = "Le Google Sheet n'est pas encore relié (voir apps-script.gs).";
      return;
    }
    msg.className = ""; msg.textContent = "Envoi en cours...";
    try {
      await fetch(CONFIG.sheetUrl, { method: "POST", mode: "no-cors", body: JSON.stringify(data) });
      msg.className = "ok";
      msg.innerHTML = `Inscription enregistrée. <a href="${waLink(`Bonjour, je suis ${data.prenom} ${data.nom}. Inscription : ${data.formations}. Total : ${money(total)}. Paiement : ${data.paiement}.`)}" target="_blank" rel="noopener">Confirmer sur WhatsApp</a>`;
    } catch (err) {
      msg.className = "err";
      msg.textContent = "Échec de l'envoi. Réessayez ou contactez-nous sur WhatsApp.";
    }
  });
  compute();
}
 