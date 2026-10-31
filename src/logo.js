// Same logo as the website: "find" + teal "me" + round yellow ASK badge at the top-right end.
export const LOGO_CSS = `
.logo{position:relative;display:inline-block;line-height:1;padding-right:.3em;font-weight:800;color:#fff;letter-spacing:-.01em}
.logo .me{color:#3E9C8B}
.logo .badge{position:absolute;top:-.28em;right:-.02em;width:.8em;height:.8em;border-radius:50%;background:#F2B544;border:.05em solid #0B2E3C;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
.logo .badge i{font-style:normal;font-size:.26em;font-weight:900;color:#2A1D00;letter-spacing:0;line-height:1}
`;

export const logoHtml = (px) =>
  `<span class="logo" style="font-size:${px}px">find<span class="me">me</span><span class="badge"><i>ASK</i></span></span>`;
