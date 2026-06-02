/* Renderiza assets/credits.json en la página de créditos.
   Atribución de imágenes con licencia Creative Commons / dominio público. */
(function () {
  "use strict";
  var mount = document.getElementById("credits");
  if (!mount) return;

  fetch("assets/credits.json")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var keys = Object.keys(data || {});
      if (!keys.length) { mount.innerHTML = "<p>Imágenes propias o sin requisitos de atribución.</p>"; return; }

      var frag = document.createDocumentFragment();
      keys.forEach(function (k) {
        var c = data[k] || {};
        var li = document.createElement("li");
        li.className = "credit";

        var title = (c.title || k).replace(/<[^>]*>/g, "").trim();
        var lic = (c.license || "").toUpperCase();
        var licV = c.license_version ? (" " + c.license_version) : "";
        var creator = c.creator || "Autor desconocido";

        var parts = [];
        parts.push('<strong>' + escapeHtml(title) + '</strong>');
        parts.push('<span>' + escapeHtml(creator) + '</span>');

        var licTxt = lic ? ("CC " + escapeHtml(lic) + escapeHtml(licV)) : "Licencia libre";
        if (c.license_url) {
          parts.push('<a href="' + escapeAttr(c.license_url) + '" target="_blank" rel="noopener">' + licTxt + '</a>');
        } else {
          parts.push('<span>' + licTxt + '</span>');
        }
        if (c.foreign_landing_url) {
          parts.push('<a href="' + escapeAttr(c.foreign_landing_url) + '" target="_blank" rel="noopener">Fuente · ' + escapeHtml(c.source || "origen") + '</a>');
        }

        li.innerHTML = parts.join(" · ");
        frag.appendChild(li);
      });
      mount.innerHTML = "";
      mount.appendChild(frag);
    })
    .catch(function () {
      mount.innerHTML = "<p>No se pudieron cargar los créditos. Consulta assets/credits.json.</p>";
    });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m];
    });
  }
  function escapeAttr(s) { return escapeHtml(s); }
})();
