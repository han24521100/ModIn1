const el = id => document.getElementById(id);
function node(tag, text, cls) {
  const item = document.createElement(tag);
  if (text !== undefined) item.textContent = text;
  if (cls) item.className = cls;
  return item;
}
const fold = text => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
async function start() {
  const response = await fetch('catalog.json', {cache: 'no-cache'});
  if (!response.ok) throw Error();
  const data = await response.json();
  if (data.summary) el('summary').textContent = data.summary;
  el('stats').textContent = data.rows.length + ' skin · ' + data.heroes + ' tướng';
  data.states.forEach((s, i) => el('state').add(new Option(s, i)));
  const search = data.rows.map(([id, name,,, sources]) => fold([id, name, ...sources.map(s => s+' '+data.sources[s])].join(' ')));
  let page = 0;

  function render() {
    const size = Number(el('size').value);
    const q = fold(el('query').value.trim());
    const state = el('state').value;
    const matches = data.rows.filter((r, i) => search[i].includes(q) && (state === '' || +state === r[2]));
    const cards = matches.slice(page*size, (page+1)*size).map(([id, name, status, note, sources]) => {
      const card = node('article', undefined, 'card');
      const head = node('div', undefined, 'skin');
      const portrait = node('div', undefined, 'portrait');
      const img = node('img');
      img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      img.onerror = () => portrait.textContent = id;
      img.src = 'https://dl.ops.kgvn.garenanow.com/hok/VN/HeroHeadPath/30'+id.slice(0,-2)+Number(id.slice(-2))+'head.jpg';
      portrait.append(img);
      const title = node('div');
      title.append(node('span', 'ID '+id, 'meta'), node('h3', name));
      head.append(portrait,title);
      card.append(head,node('span', data.states[status], 'badge s'+status));
      if (note) card.append(node('p',note,'note'));
      const details = node('details');
      const list = node('ul');
      sources.forEach(s => list.append(node('li',data.sources[s]+' · '+s)));
      details.append(node('summary','Skin Bị Đè Lên ('+sources.length+')'),list);
      card.append(details);
      return card;
    });
    el('grid').replaceChildren(...cards);
    const pages = Math.ceil(matches.length/size);
    el('message').textContent = pages ? '' : 'Không tìm thấy skin phù hợp.';
    const picker = el('page');
    if (picker.options.length !== pages) {
      picker.replaceChildren(...Array.from({length: pages}, (_, i) => new Option(i + 1, i)));
    }
    picker.value = String(page);
    el('pages').textContent = pages;
    el('pager').hidden = pages === 0;
    el('prev').hidden = page === 0;
    el('next').hidden = page+1 >= pages;
  }
  function reset() { page = 0; render(); }
  function move(delta) { page += delta; render(); el('library').scrollIntoView(); }
  el('query').oninput = reset;
  el('state').onchange = reset;
  el('size').onchange = reset;
  el('page').onchange = () => move(Number(el('page').value) - page);
  el('next').onclick = () => move(1);
  el('prev').onclick = () => move(-1);
  render();
}
start().catch(() => el('message').textContent = 'Chưa tải được danh sách skin. Hãy tải lại trang.');
