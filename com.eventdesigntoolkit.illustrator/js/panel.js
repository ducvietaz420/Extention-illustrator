(function (root) {
  'use strict';

  const storageKey = 'event-design-toolkit.simple.v1';
  const tools = [];
  const anchors = [['tl','Trên trái'],['tc','Trên giữa'],['tr','Trên phải'],['ml','Giữa trái'],['mc','Tâm'],['mr','Giữa phải'],['bl','Dưới trái'],['bc','Dưới giữa'],['br','Dưới phải']];
  const labels = {ready:'Sẵn sàng', ok:'Khớp', skip:'Bỏ qua', skipped:'Bỏ qua', missing:'Thiếu', duplicate:'Trùng', blocked:'Bị chặn', failed:'Lỗi', error:'Lỗi', applied:'Đã áp dụng', unchanged:'Đã khớp', same:'Đã khớp', warning:'Cần kiểm tra'};
  const outcomes = {missing:1, duplicate:1, blocked:1, skip:1, skipped:1, error:1, failed:1};
  const $ = id => document.getElementById(id);
  const numberFormatter = new Intl.NumberFormat('vi-VN',{maximumFractionDigits:3,useGrouping:false});
  let settings = {tool:'text-size', fields:{}};
  try { settings = Object.assign(settings, JSON.parse(root.localStorage.getItem(storageKey) || '{}')); } catch (_) { /* Optional. */ }
  let active;
  let context = {};
  let busy = false;
  let focusTimer;
  let license = null;
  let managingLicense = false;

  function save() {
    try { root.localStorage.setItem(storageKey, JSON.stringify(settings)); } catch (_) { /* Optional. */ }
  }

  function h(tag, props, ...children) {
    const element = document.createElement(tag);
    for (const [key,value] of Object.entries(props || {})) {
      if (value == null) continue;
      if (key === 'className') element.className = value;
      else if (key.startsWith('on')) element.addEventListener(key.slice(2), value);
      else if (typeof value === 'boolean') element[key] = value;
      else element.setAttribute(key,value);
    }
    for (const child of [].concat(...children)) if (child != null) element.append(child);
    return element;
  }

  function replaceContent(element, ...children) {
    element.textContent = '';
    element.append(...children);
  }

  const grid = (...children) => h('div',{className:'form-grid'},...children);
  const details = (label,...children) => h('details',{},h('summary',{},label),...children);
  const hint = value => h('p',{className:'hint'},value);
  function button(label, action, primary, title) {
    return h('button',{type:'button',className:primary ? 'primary' : '',onclick:action,title},label);
  }

  function field(view, key, label, spec) {
    const props = Object.assign({}, spec.props, {id:view.tool.id + '-' + key});
    const namespace = spec.namespace || view.tool.id;
    const saved = settings.fields[namespace] || {};
    const previous = Object.prototype.hasOwnProperty.call(saved,key) ? saved[key] : spec.value;
    const element = spec.options
      ? h('select',props,spec.options.map(([value,name]) => h('option',{value},name)))
      : h('input',Object.assign({type:spec.type || 'text'}, props));
    if (previous != null && (!spec.options || spec.options.some(([value]) => String(value) === String(previous)))) {
      element.value = previous;
    }
    view.controls[key] = element;
    const wrapper = h('div',{className:'field' + (spec.full ? ' full' : '')},h('label',{for:props.id},label),element);
    if (spec.help) {
      const caption = hint(typeof spec.help === 'string' ? spec.help : '');
      caption.id = props.id + '-help';
      element.setAttribute('aria-describedby',caption.id);
      if (typeof spec.help === 'function') view.conditions.push([caption,() => {
        caption.textContent = spec.help();
        return Boolean(caption.textContent);
      }]);
      wrapper.append(caption);
    }
    if (spec.visibleWhen) view.conditions.push([wrapper,spec.visibleWhen]);
    element.addEventListener('change',() => {
      if (spec.persist !== false) {
        if (!settings.fields[namespace]) settings.fields[namespace] = {};
        settings.fields[namespace][key] = element.value;
        save();
      }
      view.invalidate();
      view.update();
    });
    element.addEventListener('input',() => view.invalidate());
    return wrapper;
  }

  function scope(view, purpose) {
    const targets = [['all','Tất cả artboard khác'],['list','Danh sách artboard'],['current','Artboard hiện tại']];
    const selection = ['selection','Đối tượng đang chọn'];
    const options = {
      text:[selection,['active','Artboard hiện tại'],['list','Danh sách artboard'],['document','Toàn tài liệu']],
      position:targets,
      size:[selection,...targets]
    }[purpose];
    const caption = hint('');
    caption.id = view.tool.id + '-scope-help';
    view.conditions.push([caption,() => {
      const doc = context.document;
      const kind = view.get('scope');
      if (!doc) caption.textContent = 'Mở tài liệu Illustrator để tiếp tục.';
      else if (kind === 'selection') {
        caption.textContent = purpose === 'text'
          ? 'Dùng các khung chữ đang chọn và chữ nằm trong nhóm đã chọn. Đang chọn ' + doc.selectionCount + ' đối tượng.'
          : 'Sau khi lấy mẫu, chọn các đối tượng cần đổi kích thước. Chúng có thể nằm cùng một artboard.';
      } else if (kind === 'active' || kind === 'current') {
        caption.textContent = 'Dùng artboard bạn đang làm việc, hiện là artboard số ' + doc.activeArtboard + '.';
      } else if (kind === 'list') caption.textContent = 'Ví dụ 2–5, 8 nghĩa là các artboard 2, 3, 4, 5 và 8.';
      else if (kind === 'all') caption.textContent = 'Tìm đối tượng trên mọi artboard ngoài artboard chứa mẫu.';
      else caption.textContent = 'Tìm các khung chữ phù hợp trong toàn bộ tài liệu.';
      return Boolean(caption.textContent);
    }]);
    return h('div',{className:'scope'},view.field('scope',purpose === 'position' ? 'Artboard đích' : 'Phạm vi',{
      options,props:{'aria-describedby':caption.id}
    }),
      view.field('boardList','Số artboard',{
        props:{placeholder:'Ví dụ 2–5, 8'},visibleWhen:() => view.get('scope') === 'list'
      }),caption);
  }

  function scopePayload(view) {
    const kind = view.get('scope');
    if (kind !== 'list') return {kind};
    const list = view.get('boardList').trim().replace(/[–—]/g,'-');
    if (!list) throw new Error('Nhập số artboard, ví dụ 2–5, 8.');
    return {kind,list};
  }

  function docKey() {
    const doc = context.document;
    return doc ? doc.key || doc.fullName || doc.sessionId || doc.name : '';
  }

  function request(command, payload) {
    const encoded = encodeURIComponent(JSON.stringify({command,payload:payload || {}}));
    return new Promise((resolve,reject) => {
      new root.CSInterface().evalScript('EDT.dispatch(' + JSON.stringify(encoded) + ')',raw => {
        let result;
        try { result = JSON.parse(raw); }
        catch (_) { reject(new Error('Không nhận được phản hồi từ Illustrator.')); return; }
        if (!result || !result.ok) {
          const error = result && result.error;
          const failure = new Error((error && (error.message || error)) || 'Illustrator không thực hiện được thao tác.');
          failure.code = result && result.code;
          reject(failure);
        } else resolve({data:result.data || {},warnings:result.warnings || []});
      });
    });
  }

  function status(value, level) {
    $('status').textContent = value;
    $('status-dot').className = 'status-dot' + (level ? ' ' + level : '');
  }

  function licenseMessage(message, level) {
    const node = $('license-message');
    node.textContent = message;
    node.className = 'notification' + (level ? ' ' + level : '');
    node.hidden = !message;
  }

  function licenseDescription(data) {
    if (data.active) {
      if (data.type === 'permanent') return 'Đang dùng key vĩnh viễn.';
      const term = {day:'ngày',month:'tháng',year:'năm'}[data.type];
      const expires = new Date(data.expiresAt).toLocaleString('vi-VN',{
        day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'
      });
      return 'Đang dùng key ' + term + '. Hết hạn lúc ' + expires + '.';
    }
    return {
      missing:'Nhập key để mở các công cụ của EVENT DESIGN TOOLKIT.',
      invalid:'Key đã lưu không hợp lệ. Nhập key do người quản trị cấp.',
      expired:'Key đã hết hạn. Nhập key mới để tiếp tục.',
      clock:'Hãy kiểm tra ngày và giờ của máy, rồi bấm Kiểm tra lại.',
      storage:'Không đọc được key đã lưu. Kiểm tra quyền truy cập hồ sơ Windows.'
    }[data.reason] || 'Chưa kiểm tra được trạng thái key. Bấm Kiểm tra lại.';
  }

  function showLicense(data) {
    if (license && license.active && !data.active && active) active.invalidate();
    license = data;
    const visible = managingLicense || !data.active;
    $('license-view').hidden = !visible;
    $('workspace').hidden = visible;
    $('navigation').hidden = visible;
    $('license-manage').hidden = visible;
    $('refresh').hidden = visible;
    $('license-back').hidden = !data.active;
    $('license-remove').hidden = !data.active;
    $('license-heading').textContent = data.active ? 'Quản lý key' : 'Kích hoạt Toolkit';
    $('license-description').textContent = licenseDescription(data);
    $('license-submit').textContent = data.active ? 'Đổi key' : 'Kích hoạt';
    if (visible) {
      $('document-line').textContent = data.active ? 'Key đang hoạt động' : 'Cần kích hoạt key';
      $('document-line').removeAttribute('title');
    }
  }

  async function loadLicense() {
    try {
      const {data} = await request('licenseStatus');
      showLicense(data);
      return data;
    } catch (error) {
      showLicense({active:false});
      licenseMessage(error.message,'error');
      throw error;
    }
  }

  function notify(view, message, level) {
    replaceContent(view.output,h('p',{className:'notification' + (level ? ' ' + level : '')},message));
  }

  function readDimension(width,height,unit) {
    return `Rộng ${numberFormatter.format(width)} × Cao ${numberFormatter.format(height)} ${unit}`;
  }

  function renderRow(view,row,options) {
    const board = row.boardNumber || row.artboard;
    const title = [board ? 'Artboard ' + board : '',row.name || row.title].filter(Boolean).join(' · ') || 'Đối tượng';
    const needsReview = options.fill && row.status === 'applied' && row.reason;
    const badge = needsReview ? 'Cần kiểm tra' : options.fill && row.status === 'applied' ? 'Đã tạo' : labels[row.status] || row.status || '';
    const card = h('article',{className:'row'},h('div',{className:'row-header'},
      h('strong',{},title),h('span',{className:'row-badge' + (needsReview || outcomes[row.status] ? ' warn' : '')},badge)));
    const note = message => card.append(h('p',{className:'detail'},message));
    const dimensions = value => readDimension(value[0],value[1],row.unit || 'cm');
    const valueText = value => {
      if (!Array.isArray(value)) return String(value);
      if (options.position) return `X ${numberFormatter.format(value[0])} · Y ${numberFormatter.format(value[1])} ${row.unit || 'cm'}`;
      return value.join(' · ');
    };
    if (row.beforeSize) note('Trước: ' + dimensions(row.beforeSize));
    if (row.afterSize) note('Sau: ' + dimensions(row.afterSize));
    if (!options.size && row.before != null) note('Trước: ' + valueText(row.before));
    if (!options.size && row.after != null) note('Sau: ' + valueText(row.after));
    if (options.fill && typeof row.text === 'string') card.append(h('p',{className:'fill-row-text'},row.text));
    if (row.reason || row.message) note(row.reason || row.message);
    if (options.select) {
      const selectItem = (uuid,caption) => button(caption,() => execute(view,() => request('selectSyncItem',{uuid})));
      if (row.uuid) card.append(selectItem(row.uuid,'Chọn đối tượng'));
      else if (row.matches) for (const match of row.matches) {
        if (match.uuid) card.append(selectItem(match.uuid,'Chọn ' + (match.name || 'đối tượng')));
      }
    }
    return card;
  }

  function show(view,result,options) {
    const {data} = result;
    const stats = [];
    const count = data.count == null ? data.total : data.count;
    if (typeof count === 'number' && data.applied == null) stats.push(`${count} ${options.item || 'đối tượng'}`);
    if (typeof data.applied === 'number') stats.push((options.fill ? 'Đã tạo ' : 'Đã áp dụng ') + data.applied);
    if (data.remaining > 0) stats.push('Còn ' + data.remaining);
    if (data.skipped > 0) stats.push('Bỏ qua ' + data.skipped);
    if (data.failed > 0) stats.push('Lỗi ' + data.failed);
    const warnings = [...new Set([...(result.warnings || []),...(data.warnings || [])])];
    const extras = Array.isArray(data.skipped) ? data.skipped.map(row => Object.assign({status:'skipped'}, row)) : [];
    const rows = (data.rows || []).concat(extras);
    replaceContent(view.output,h('h2',{},options.title),h('p',{},stats.join(' · ')));
    if (options.fill && data.sourceBoard) {
      const {number,name} = data.sourceBoard;
      const source = ['Mẫu', 'Artboard ' + number,name].filter(Boolean);
      if (Number.isInteger(data.frameCount) && data.frameCount > 0) source.push(data.frameCount + ' khung chữ');
      const frames = Array.isArray(data.frames) && data.frames.length ? data.frames : [data];
      const styles = new Set(frames.map(frame => [frame.font, Number.isFinite(frame.size) ? numberFormatter.format(frame.size) + ' pt' : '']
        .filter(Boolean).join(' ')).filter(Boolean));
      view.output.append(h('p',{className:'hint'},source.join(' · ')));
      if (styles.size) view.output.append(h('p',{className:'hint'},[...styles].join(' · ')));
    }
    if (rows.length) {
      const section = h('div',{className:'rows'});
      const more = button('Hiện thêm',appendRows);
      let cursor = 0;
      function appendRows() {
        const end = Math.min(cursor + 80,rows.length);
        while (cursor < end) section.append(renderRow(view,rows[cursor++],options));
        more.hidden = cursor >= rows.length;
      }
      appendRows();
      view.output.append(section,more);
    }
    if (warnings.length) view.output.append(h('p',{className:'notification warn'},warnings.join('\n')));
  }

  async function execute(view,work) {
    if (busy) return;
    if (view && !context.document) {
      notify(view,'Mở tài liệu Illustrator rồi bấm Làm mới.','warn');
      return;
    }
    busy = true;
    document.body.setAttribute('aria-busy','true');
    status('Đang làm việc trong Illustrator…');
    try { await work(); status('Đã nhận kết quả từ Illustrator.','ok'); }
    catch (error) {
      if (error.code === 'LICENSE_REQUIRED') {
        managingLicense = false;
        try { await loadLicense(); } catch (_) { /* Status is already displayed. */ }
        licenseMessage(error.message,'error');
      } else if (view && !error.keepOutput) {
        notify(view,error.message,'error');
      }
      status(error.message,'error');
    }
    finally { busy = false; document.body.removeAttribute('aria-busy'); }
  }

  async function refreshDocument(passive) {
    const previous = docKey();
    context = (await request('context')).data;
    const doc = context.document;
    const label = doc ? `${doc.name} · Artboard ${doc.activeArtboard}/${doc.artboards.length}` : 'Chưa mở tài liệu Illustrator';
    $('document-line').textContent = $('document-line').title = label;
    if (active) {
      if (!passive || previous !== docKey()) active.invalidate();
      active.update();
    }
  }

  async function refresh(passive) {
    await execute(null,async () => {
      const data = await loadLicense();
      if (data.active && !managingLicense) await refreshDocument(passive);
    });
  }

  function open(id) {
    if (busy) return;
    const tool = tools.find(entry => entry.id === id) || tools[0];
    const view = {
      tool,controls:{},conditions:[],invalidate:() => {},
      output:h('section',{className:'result','aria-live':'polite'})
    };
    view.field = (key,label,spec = {}) => field(view,key,label,spec);
    view.scope = purpose => scope(view,purpose);
    view.scopePayload = () => scopePayload(view);
    view.get = key => view.controls[key].value;
    view.update = () => { for (const [element,predicate] of view.conditions) element.hidden = !predicate(); };
    replaceContent($('navigation'),...tools.map(entry => h('button',{
      type:'button',className:entry === tool ? 'active' : '',
      'aria-current':entry === tool ? 'page' : null,
      onclick:() => { if (active.tool !== entry) open(entry.id); }
    },entry.label)));
    replaceContent($('workspace'),tool.render(view),view.output);
    settings.tool = tool.id;
    save();
    active = view;
    view.update();
    root.scrollTo(0,0);
  }

  function setupPlan(view,body,spec) {
    let token;
    let revision = 0;
    let canceled = false;
    const scanLabel = spec.scanLabel || 'Xem kế hoạch';
    const applyLabel = spec.applyLabel || 'Áp dụng';
    const scan = button(scanLabel,() => execute(view,async () => {
      reset();
      const snapshot = revision;
      if (spec.options.fill) status('Đang kiểm tra các khung chữ mẫu…');
      const response = await request(spec.scan,spec.payload());
      if (revision !== snapshot) {
        notify(view,'Thiết lập đã thay đổi. Xem kế hoạch mới.','warn');
        return;
      }
      show(view,response,Object.assign({title:spec.options.fill ? 'Xem trước' : 'Kế hoạch'}, spec.options));
      const data = response.data;
      const ready = data.count == null ? data.total : data.count;
      if (data.token && ready > 0) token = data.token;
      const hasConflicts = (data.rows || []).some(row => ['missing','duplicate','blocked'].includes(row.status));
      apply.disabled = !token;
      if (token && hasConflicts) apply.textContent = spec.options.fill ? 'Tạo mục hợp lệ' : 'Áp dụng mục hợp lệ';
    }));
    const apply = button(applyLabel,() => execute(view,async () => {
      if (!token) return;
      const current = token;
      reset(false);
      scan.disabled = true;
      if (spec.options.fill) status('Đang kiểm tra artwork mẫu…');
      canceled = false;
      cancel.disabled = false;
      cancel.hidden = false;
      const aggregate = {rows:[],warnings:[],applied:0,failed:0,skipped:0};
      let nextIndex;
      let groups = 0;
      try {
        while (groups < 10000) {
          const {data,warnings} = await request(spec.apply,{token:current,batchSize:spec.batch,index:nextIndex});
          groups++;
          if (data.nextIndex != null) nextIndex = data.nextIndex;
          for (const key of ['applied','failed','skipped']) {
            if (typeof data[key] === 'number') aggregate[key] += data[key];
          }
          if (data.rows) aggregate.rows.push(...data.rows);
          aggregate.warnings.push(...warnings,...(data.warnings || []));
          aggregate.remaining = data.remaining;
          const preparing = spec.options.fill && data.phase === 'prepare';
          const title = preparing ? 'Đang kiểm tra artwork mẫu' : data.done === false ? 'Đang xử lý' : 'Kết quả';
          if (preparing && Number.isInteger(data.checked)) {
            status('Đã kiểm tra ' + data.checked + ' đối tượng. Đang chuẩn bị lượt tiếp theo…');
          }
          if (spec.options.fill && !preparing && !canceled) status('Đang tạo artboard…');
          show(view,{data:aggregate},Object.assign({title}, spec.options));
          if (data.done !== false) break;
          await new Promise(resolve => root.setTimeout(resolve,12));
          if (canceled || groups === 10000) {
            await request(spec.cancel,{token:current});
            view.output.prepend(h('p',{className:'notification warn'},'Đã dừng trước nhóm tiếp theo. Xem kế hoạch mới để tiếp tục.'));
            break;
          }
        }
      } catch (error) {
        if (!groups) throw error;
        view.output.prepend(h('p',{className:'notification error'},error.message));
        error.keepOutput = true;
        throw error;
      } finally {
        scan.disabled = false;
        cancel.hidden = true;
        if (spec.options.fill && aggregate.applied > 0) root.setTimeout(() => refresh(true),0);
      }
    }),true);
    const cancel = button('Dừng sau nhóm này',() => {
      canceled = true;
      cancel.disabled = true;
      status('Sẽ dừng sau nhóm đang xử lý.','warn');
    });
    function reset(clear = true) {
      revision++;
      if (token && clear) notify(view,'Thiết lập đã thay đổi. Xem kế hoạch mới.');
      token = null;
      apply.disabled = true;
      apply.textContent = applyLabel;
    }
    view.invalidate = reset;
    apply.disabled = true;
    cancel.hidden = true;
    body.append(h('div',{className:'actions'},scan,apply,cancel));
    return body;
  }

  root.EventToolkit = {
    tools,anchors,h,grid,details,hint,button,request,execute,notify,
    setupPlan,readDimension,docKey
  };
  document.addEventListener('DOMContentLoaded',() => {
    $('refresh').addEventListener('click',() => refresh(false));
    $('license-recheck').addEventListener('click',() => {
      licenseMessage('');
      refresh(false);
    });
    $('license-manage').addEventListener('click',() => {
      if (busy) return;
      managingLicense = true;
      licenseMessage('');
      showLicense(license);
      $('license-key').focus();
    });
    $('license-back').addEventListener('click',() => {
      if (busy) return;
      managingLicense = false;
      $('license-key').value = '';
      licenseMessage('');
      showLicense(license);
      refresh(true);
    });
    $('license-form').addEventListener('submit',event => {
      event.preventDefault();
      const input = $('license-key');
      const key = input.value;
      if (!key.trim()) {
        licenseMessage('Dán key sử dụng trước khi kích hoạt.','warn');
        return;
      }
      execute(null,async () => {
        let data;
        try { ({data} = await request('activateLicense',{key})); }
        catch (error) { licenseMessage(error.message,'error'); throw error; }
        input.value = '';
        managingLicense = false;
        licenseMessage('');
        showLicense(data);
        if (data.active) await refreshDocument(false);
      });
    });
    $('license-remove').addEventListener('click',() => {
      if (busy || !root.confirm('Gỡ key khỏi hồ sơ này? Bạn sẽ cần key để kích hoạt lại.')) return;
      execute(null,async () => {
        let data;
        try { ({data} = await request('deactivateLicense')); }
        catch (error) { licenseMessage(error.message,'error'); throw error; }
        $('license-key').value = '';
        managingLicense = false;
        licenseMessage('Đã gỡ key đã lưu khỏi hồ sơ này. Giữ bản sao key nếu bạn muốn dùng lại.');
        showLicense(data);
      });
    });
    root.addEventListener('focus',() => {
      root.clearTimeout(focusTimer);
      focusTimer = root.setTimeout(() => refresh(true),100);
    });
    open(settings.tool);
    refresh(false);
  });
}(window));
