// ─── STATE + SUPABASE ─────────────────────────────────────────────────────
    // Troque pelos dados do seu projeto Supabase: Project Settings → API.
    const SUPABASE_URL = 'https://gnyjpaaldizqfzyywfba.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_BS-7etqYNJ0d7WZHXlZKsQ_r7MJ-9bB';

    const SUPABASE_CONFIGURED =
      SUPABASE_URL.startsWith('https://') &&
      !SUPABASE_URL.includes('SEU_PROJETO') &&
      SUPABASE_ANON_KEY &&
      !SUPABASE_ANON_KEY.includes('SUA_ANON_KEY');

    let db = null;
    let supabaseScriptPromise = null;

    function loadSupabaseScript() {
      if (window.supabase) return Promise.resolve(window.supabase);
      if (supabaseScriptPromise) return supabaseScriptPromise;

      supabaseScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.async = true;
        script.onload = () => resolve(window.supabase);
        script.onerror = () => reject(new Error('Não foi possível carregar a biblioteca Supabase JS. Verifique a internet ou o CDN.'));
        document.head.appendChild(script);
      });

      return supabaseScriptPromise;
    }

    async function setupSupabaseClient() {
      if (!SUPABASE_CONFIGURED) return null;
      if (db) return db;

      const supabaseLib = await loadSupabaseScript();
      if (!supabaseLib) throw new Error('Biblioteca Supabase JS não disponível.');
      db = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      return db;
    }

    const appData = {
      skus: [],
      movs: [],
      compras: [],
      financeiro: [],
      cartoes: [],
      contas: [],
      logs: []
    };

    function cloneRows(rows) { return (rows || []).map(r => ({ ...r })); }
    function loadSkus() { return cloneRows(appData.skus); }
    function loadMovs() { return cloneRows(appData.movs); }
    function loadCompras() { return cloneRows(appData.compras); }
    function loadFinanceiro() { return cloneRows(appData.financeiro); }
    function loadCartoes() { return cloneRows(appData.cartoes); }
    function loadContas() { return cloneRows(appData.contas); }
    function loadLogs() { return cloneRows(appData.logs); }

    function makeId() {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    function n(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
    function i(value, fallback = 0) { const parsed = parseInt(value, 10); return Number.isFinite(parsed) ? parsed : fallback; }
    function cleanText(value, fallback = '') { return (value === null || value === undefined || value === '') ? fallback : String(value); }
    function nullableUuid(value) { return value ? String(value) : null; }
    function assertSupabase() {
      if (!db) {
        throw new Error('Supabase não configurado. Preencha SUPABASE_URL e SUPABASE_ANON_KEY no início do bloco <script>.');
      }
    }
    async function requireSupabase() {
      assertSupabase();
    }
    function handleAsyncError(err, fallback = 'Erro ao executar operação.') {
      console.error(err);
      const detail = err && err.message ? err.message : String(err || '');
      if (typeof showToast === 'function') {
        showToast('error', fallback, detail);
      } else {
        alert(`${fallback}\n\n${detail}`);
      }
    }

    function mapSkuFromDb(r) {
      return {
        id: r.id, name: cleanText(r.name), code: cleanText(r.code), kind: cleanText(r.kind, 'unitario'),
        emoji: cleanText(r.emoji, '📦'), cost: n(r.cost), packageCost: n(r.package_cost),
        tax: cleanText(r.tax, 'Padrão da conta'), qty: i(r.qty), min: i(r.min, 5), ads: n(r.ads),
        sync: Boolean(r.sync), anunciado: Boolean(r.anunciado), super: Boolean(r.super), createdAt: r.created_at, updatedAt: r.updated_at
      };
    }
    function mapSkuToDb(s) {
      return {
        id: s.id || makeId(), name: cleanText(s.name), code: cleanText(s.code),
        kind: s.kind === 'kit' ? 'kit' : 'unitario', emoji: cleanText(s.emoji, s.kind === 'kit' ? '🧩' : '📦'),
        cost: n(s.cost), package_cost: n(s.packageCost), tax: cleanText(s.tax, 'Padrão da conta'),
        qty: i(s.qty), min: i(s.min, 5), ads: n(s.ads), sync: Boolean(s.sync), anunciado: Boolean(s.anunciado), super: Boolean(s.super)
      };
    }
    function mapMovFromDb(r) {
      return {
        id: r.id, skuId: r.sku_id, skuName: cleanText(r.sku_name), type: r.type,
        qty: i(r.qty), cost: n(r.cost), note: cleanText(r.note), notes: cleanText(r.notes),
        previousQty: i(r.previous_qty), qtyAfter: i(r.qty_after), previousCost: n(r.previous_cost),
        averageCostAfter: n(r.average_cost_after), date: r.date, createdAt: r.created_at
      };
    }
    function mapMovToDb(m) {
      return {
        id: m.id || makeId(), sku_id: m.skuId, sku_name: cleanText(m.skuName), type: m.type,
        qty: i(m.qty), cost: n(m.cost), note: cleanText(m.note), notes: cleanText(m.notes),
        previous_qty: i(m.previousQty), qty_after: i(m.qtyAfter), previous_cost: n(m.previousCost),
        average_cost_after: n(m.averageCostAfter), date: m.date || new Date().toISOString()
      };
    }
    function mapCompraFromDb(r) {
      return {
        id: r.id, sku: cleanText(r.sku), compraNome: cleanText(r.compra_nome), compraLink: cleanText(r.compra_link),
        catNome: cleanText(r.cat_nome), catLink: cleanText(r.cat_link), qty: i(r.qty, 1), preco: n(r.preco),
        total: n(r.total), cartaoId: r.cartao_id || '', contaId: r.conta_id || '', parcelas: i(r.parcelas, 1), venda: n(r.venda),
        margem: cleanText(r.margem), roi: cleanText(r.roi), date: r.date, createdAt: r.created_at
      };
    }
    function mapCompraToDb(c) {
      return {
        id: c.id || makeId(), sku: cleanText(c.sku), compra_nome: cleanText(c.compraNome),
        compra_link: cleanText(c.compraLink), cat_nome: cleanText(c.catNome), cat_link: cleanText(c.catLink),
        qty: i(c.qty, 1), preco: n(c.preco), total: n(c.total), cartao_id: nullableUuid(c.cartaoId),
        conta_id: nullableUuid(c.contaId), parcelas: i(c.parcelas, 1), venda: n(c.venda), margem: cleanText(c.margem), roi: cleanText(c.roi),
        date: c.date || new Date().toISOString()
      };
    }
    function mapCartaoFromDb(r) {
      return { id: r.id, nome: cleanText(r.nome), digitos: cleanText(r.digitos), limite: n(r.limite), utilizado: n(r.utilizado), createdAt: r.created_at, updatedAt: r.updated_at };
    }
    function mapCartaoToDb(c) {
      return { id: c.id || makeId(), nome: cleanText(c.nome), digitos: cleanText(c.digitos), limite: n(c.limite), utilizado: n(c.utilizado) };
    }
    function mapContaFromDb(r) {
      return { id: r.id, plataforma: cleanText(r.plataforma), usuario: cleanText(r.usuario), createdAt: r.created_at, updatedAt: r.updated_at };
    }
    function mapContaToDb(c) {
      return { id: c.id || makeId(), plataforma: cleanText(c.plataforma), usuario: cleanText(c.usuario) };
    }
    function mapLancFromDb(r) {
      return { id: r.id, descricao: cleanText(r.descricao), tipo: r.tipo, valor: n(r.valor), data: r.data, categoria: cleanText(r.categoria), cartaoId: r.cartao_id || '', createdAt: r.created_at };
    }
    function mapLancToDb(l) {
      return { id: l.id || makeId(), descricao: cleanText(l.descricao), tipo: l.tipo, valor: n(l.valor), data: l.data || new Date().toISOString().slice(0, 10), categoria: cleanText(l.categoria), cartao_id: nullableUuid(l.cartaoId) };
    }
    function mapLogFromDb(r) {
      return {
        id: r.id, tabela: cleanText(r.tabela), acao: cleanText(r.acao), registroId: cleanText(r.registro_id),
        descricao: cleanText(r.descricao), dadosAnteriores: r.dados_anteriores || null, dadosNovos: r.dados_novos || null,
        usuarioId: r.usuario_id || '', usuarioRole: cleanText(r.usuario_role), origem: cleanText(r.origem, 'app'),
        createdAt: r.created_at
      };
    }

    async function fetchTable(table, orderColumn = 'created_at', ascending = true, columns = '*', limit = 1000) {
  assertSupabase();
  const { data, error } = await db.from(table)
    .select(columns)
    .order(orderColumn, { ascending })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

    // Cada tabela busca só as colunas que o app realmente usa (mapXFromDb),
    // em vez de "select *" — menos dado trafegado, resposta mais rápida.
    const TABLE_COLUMNS = {
      produtos: 'id,name,code,kind,emoji,cost,package_cost,tax,qty,min,ads,sync,anunciado,super,created_at,updated_at',
      movimentacoes: 'id,sku_id,sku_name,type,qty,cost,note,notes,previous_qty,qty_after,previous_cost,average_cost_after,date,created_at',
      compras: 'id,sku,compra_nome,compra_link,cat_nome,cat_link,qty,preco,total,cartao_id,conta_id,parcelas,venda,margem,roi,date,created_at',
      cartoes: 'id,nome,digitos,limite,utilizado,created_at,updated_at',
      lancamentos: 'id,descricao,tipo,valor,data,categoria,cartao_id,created_at',
      contas: 'id,plataforma,usuario,created_at,updated_at',
      system_logs: 'id,tabela,acao,registro_id,descricao,dados_anteriores,dados_novos,usuario_id,usuario_role,origem,created_at'
    };

    async function loadAllData() {
      if (!db) {
        const msg = 'Configure SUPABASE_URL e SUPABASE_ANON_KEY no arquivo para carregar os dados do Supabase.';
        const container = document.getElementById('dash-movs');
        if (container) container.innerHTML = `<div class="empty-state"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.3; display:block; color: var(--text-muted);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg><p>${msg}</p></div>`;
        console.warn(msg);
        return;
      }

      try {
        // Todas as tabelas do carregamento inicial saem em paralelo (inclusive
        // "contas", que antes era buscada só depois das outras terminarem).
        // "system_logs" fica de fora daqui de propósito: só é usada na tela
        // de Logs, que já faz sua própria busca (refreshLogs) ao ser aberta —
        // buscá-la aqui de novo seria uma requisição inteira desperdiçada
        // em toda inicialização/F5.
        const [produtosR, movimentacoesR, comprasR, cartoesR, lancamentosR, contasR] = await Promise.allSettled([
      fetchTable('produtos', 'created_at', true, TABLE_COLUMNS.produtos, 3000), // Limite flexível para produtos
      fetchTable('movimentacoes', 'date', false, TABLE_COLUMNS.movimentacoes, 300), // Traz apenas as últimas 300 para o histórico
      fetchTable('compras', 'date', false, TABLE_COLUMNS.compras, 300),
      fetchTable('cartoes', 'created_at', true, TABLE_COLUMNS.cartoes, 100),
      fetchTable('lancamentos', 'data', false, TABLE_COLUMNS.lancamentos, 300),
      fetchTable('contas', 'created_at', true, TABLE_COLUMNS.contas, 100)
    ]);

        // Tabelas essenciais: se alguma falhar, propaga o erro como antes.
        const essenciais = { produtos: produtosR, movimentacoes: movimentacoesR, compras: comprasR, cartoes: cartoesR, lancamentos: lancamentosR };
        for (const [nome, resultado] of Object.entries(essenciais)) {
          if (resultado.status === 'rejected') throw resultado.reason;
        }

        appData.skus = produtosR.value.map(mapSkuFromDb);
        appData.movs = movimentacoesR.value.map(mapMovFromDb);
        appData.compras = comprasR.value.map(mapCompraFromDb);
        appData.cartoes = cartoesR.value.map(mapCartaoFromDb);
        appData.financeiro = lancamentosR.value.map(mapLancFromDb);

        // "contas" é opcional (projeto pode não ter rodado a migration ainda),
        // então uma falha aqui não deve travar o resto do app.
        if (contasR.status === 'fulfilled') {
          appData.contas = contasR.value.map(mapContaFromDb);
        } else {
          console.warn('Tabela de contas ainda não encontrada. Rode a migration_contas.sql no Supabase.', contasR.reason);
          appData.contas = [];
        }
      } catch (err) {
        handleAsyncError(err, 'Não foi possível carregar os dados do Supabase.');
      }
    }

    async function persistCollection(cacheKey, table, rows, mapper) {
      assertSupabase();
      const previous = cloneRows(appData[cacheKey]);
      const next = cloneRows(rows).map(r => ({ ...r, id: r.id || makeId() }));
      const previousIds = new Set(previous.map(r => String(r.id)));
      const nextIds = new Set(next.map(r => String(r.id)));
      const deletedIds = [...previousIds].filter(id => !nextIds.has(id));

      if (deletedIds.length) {
        const { error } = await db.from(table).delete().in('id', deletedIds);
        if (error) throw error;
      }
      if (next.length) {
        const { error } = await db.from(table).upsert(next.map(mapper), { onConflict: 'id' });
        if (error) throw error;
      }
      appData[cacheKey] = next;
      return next;
    }

    // Atualiza UMA linha específica (update pontual), em vez de reenviar a
    // coleção inteira. Isso evita que um snapshot local desatualizado
    // sobrescreva/reverta alterações feitas por outra ação (ex: uma
    // movimentação de estoque) que aconteceu entre a leitura e o salvamento.
    async function updateRowById(table, cacheKey, id, dbPatch, localPatch) {
      assertSupabase();
      const { error } = await db.from(table).update(dbPatch).eq('id', id);
      if (error) throw error;
      const idx = appData[cacheKey].findIndex(r => String(r.id) === String(id));
      if (idx !== -1) appData[cacheKey][idx] = { ...appData[cacheKey][idx], ...(localPatch || {}) };
    }

    async function deleteById(table, cacheKey, id) {
      assertSupabase();
      const { error } = await db.from(table).delete().eq('id', id);
      if (error) throw error;
      appData[cacheKey] = appData[cacheKey].filter(r => String(r.id) !== String(id));
    }

    async function saveSkus(rows) { return persistCollection('skus', 'produtos', rows, mapSkuToDb); }
    async function saveMovs(rows) { return persistCollection('movs', 'movimentacoes', rows, mapMovToDb); }
    async function saveCompras(rows) { return persistCollection('compras', 'compras', rows, mapCompraToDb); }
    async function saveFinanceiro2(rows) { return persistCollection('financeiro', 'lancamentos', rows, mapLancToDb); }
    async function saveCartoes(rows) { return persistCollection('cartoes', 'cartoes', rows, mapCartaoToDb); }
    async function saveContas(rows) { return persistCollection('contas', 'contas', rows, mapContaToDb); }

    let currentProductId = null;
    let movClientRef = null;
    let detailMovFilter = 'todos';
    let detailMovType = 'entrada';
    let productKind = 'unitario';
    let editProductKind = 'unitario';
    let finType = 'receita';
    let currentSubpage = 'compras';
    let currentMovTab = 'entrada';
    let editCompraId = null;
    let editCartaoId = null;
    let editContaId = null;
    let pendingConfirmAction = null;

    // ─── SIDEBAR & NAV ───────────────────────────────────────────────────────────
    function toggleSidebar() { const sb = document.getElementById('sidebar'); const ov = document.getElementById('sidebar-overlay'); const isOpen = sb.classList.contains('open'); sb.classList.toggle('open', !isOpen); ov.classList.toggle('open', !isOpen); }
    function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').classList.remove('open'); }
    const BREADCRUMBS = {
      dashboard: ['Dashboard', 'Início'],
      estoque: ['Produtos', 'Estoque'],
      anunciados: ['Produtos', 'Itens Anunciados'],
      movimentacoes: ['Operação', 'Movimentações'],
      'produto-detalhe': ['Produtos', 'Detalhe do Produto'],
      logs: ['Sistema', 'Logs de Auditoria'],
      compras: ['Operação', 'Compras'],
    };
    function setBreadcrumb(page) {
      const bc = BREADCRUMBS[page] || ['', page];
      const el = document.getElementById('breadcrumb');
      if (el) el.innerHTML = `<span>${bc[0]}</span><span class="sep">›</span><span class="current">${bc[1]}</span>`;
    }
    function navigate(page) {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('[id^="page-"]').forEach(p => p.classList.remove('active'));
      setBreadcrumb(page);
      if (page === 'dashboard') { document.getElementById('nav-dashboard').classList.add('active'); document.getElementById('page-dashboard').classList.add('active'); renderDashboard(); }
      else if (page === 'estoque') { document.getElementById('nav-estoque').classList.add('active'); document.getElementById('page-estoque').classList.add('active'); renderKpis(); renderTable(); }
      else if (page === 'anunciados') { document.getElementById('nav-anunciados').classList.add('active'); document.getElementById('page-anunciados').classList.add('active'); renderAnunciados(); }
      else if (page === 'movimentacoes') { document.getElementById('nav-movimentacoes').classList.add('active'); document.getElementById('page-movimentacoes').classList.add('active'); renderMovimentacoes(); }
      else if (page === 'produto-detalhe') { document.getElementById('nav-estoque').classList.add('active'); document.getElementById('page-produto-detalhe').classList.add('active'); renderProductDetail(); }
      else if (page === 'logs') { document.getElementById('nav-logs').classList.add('active'); document.getElementById('page-logs').classList.add('active'); refreshLogs({ silent: true }); }
      else if (page === 'compras') {
        document.getElementById('nav-compras').classList.add('active');
        document.getElementById('page-compras').classList.add('active');
        abrirSubmenuCompras();
        switchSubpage(currentSubpage);
      }
      else if (page === 'contas') {
        document.getElementById('page-contas').classList.add('active');
        abrirSubmenuCompras();
        atualizarBreadcrumbCompras('contas');
        highlightComprasSubnav('contas');
        renderContas();
      }
      salvarUltimaPagina(page);
    }

    // ─── PERSISTÊNCIA DE PÁGINA (mantém a página ao atualizar/F5) ───────────────
    function salvarUltimaPagina(page, extra) {
      try {
        const dados = { page, productId: extra && extra.productId ? extra.productId : (page === 'produto-detalhe' ? currentProductId : null), subpage: page === 'compras' ? currentSubpage : null, movTab: page === 'movimentacoes' ? currentMovTab : null };
        localStorage.setItem('ultimaPagina', JSON.stringify(dados));
      } catch (e) { /* localStorage indisponível: ignora silenciosamente */ }
    }
    function restaurarUltimaPagina() {
      let dados = null;
      try { dados = JSON.parse(localStorage.getItem('ultimaPagina') || 'null'); } catch (e) { dados = null; }
      if (!dados || !dados.page) { navigate('dashboard'); return; }

      if (dados.page === 'produto-detalhe' && dados.productId) {
        const existe = loadSkus().some(s => idsMatch(s.id, dados.productId));
        if (!existe) { navigate('dashboard'); return; }
        currentProductId = dados.productId;
        detailMovFilter = 'todos';
        navigate('produto-detalhe');
        return;
      }
      if (dados.page === 'compras' && dados.subpage) currentSubpage = dados.subpage;
      if (dados.page === 'movimentacoes' && dados.movTab) currentMovTab = dados.movTab;

      const paginasValidas = ['dashboard', 'estoque', 'anunciados', 'movimentacoes', 'logs', 'compras', 'contas'];
      navigate(paginasValidas.includes(dados.page) ? dados.page : 'dashboard');
    }
    // ESC fecha modal aberto
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const open = document.querySelector('.modal-overlay.open');
        if (open) open.classList.remove('open');
        if (document.querySelector('.sidebar.open')) closeSidebar();
      }
    });
    function toggleSubmenu(id) {
      const sub = document.getElementById(id); const expId = id === 'produtos-sub' ? 'produtos-expand' : 'compras-expand';
      const exp = document.getElementById(expId); const open = sub.style.display === 'block';
      sub.style.display = open ? 'none' : 'block'; if (exp) exp.classList.toggle('open', !open);
    }
    function abrirSubmenuCompras() {
      const sub = document.getElementById('compras-sub');
      const exp = document.getElementById('compras-expand');
      if (sub) sub.style.display = 'block';
      if (exp) exp.classList.add('open');
    }
    function atualizarBreadcrumbCompras(name) {
      const el = document.getElementById('breadcrumb');
      if (!el) return;
      const labels = { financeiro: 'Financeiro', contas: 'Contas de Compra', compras: 'Registro de Compras' };
      const atual = labels[name] || 'Registro de Compras';
      el.innerHTML = `<span>Compras</span><span class="sep">›</span><span class="current">${atual}</span>`;
    }
    function highlightComprasSubnav(name) {
      document.getElementById('nav-compras').classList.add('active');
      const navRegistro = document.getElementById('nav-compras-registro');
      const navFinanceiro = document.getElementById('nav-financeiro');
      const navContas = document.getElementById('nav-contas');
      if (navRegistro) navRegistro.classList.toggle('active', name === 'compras');
      if (navFinanceiro) navFinanceiro.classList.toggle('active', name === 'financeiro');
      if (navContas) navContas.classList.toggle('active', name === 'contas');
    }
    function switchSubpage(name) {
      currentSubpage = name;
      abrirSubmenuCompras();
      atualizarBreadcrumbCompras(name);
      highlightComprasSubnav(name);
      document.getElementById('subpage-compras').classList.toggle('active', name === 'compras');
      document.getElementById('subpage-financeiro').classList.toggle('active', name === 'financeiro');
      document.getElementById('subtab-compras').classList.toggle('active', name === 'compras');
      document.getElementById('subtab-financeiro').classList.toggle('active', name === 'financeiro');
      if (name === 'compras') {
        document.getElementById('compras-page-title').textContent = 'Registro de Compras';
        document.getElementById('compras-page-sub').textContent = 'Gerencie suas compras e calcule margens e ROI.';
        document.getElementById('compras-page-actions').innerHTML = `<button class="btn btn-ghost" style="font-size:12px;padding:6px 12px" onclick="openCompraModal()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>Nova Compra</button>`;
        renderCompras();
      } else {
        document.getElementById('compras-page-title').textContent = 'Financeiro';
        document.getElementById('compras-page-sub').textContent = 'Acompanhe receitas, despesas e fluxo de caixa.';
        document.getElementById('compras-page-actions').innerHTML = '';
        renderFinanceiro(); renderCartoes();
      }
      salvarUltimaPagina('compras');
    }
    function openModal(name) { const modal = document.getElementById('modal-' + name); if (modal) modal.classList.add('open'); }
    function closeModal(name) { const modal = document.getElementById('modal-' + name); if (modal) modal.classList.remove('open'); }

    function openConfirmacao({ titulo = 'Confirmar ação', subtitulo = 'Validação necessária antes de continuar.', mensagem = 'Tem certeza de que deseja continuar?', textoSim = 'Sim', textoNao = 'Não', onConfirm = null } = {}) {
      pendingConfirmAction = typeof onConfirm === 'function' ? onConfirm : null;
      document.getElementById('confirm-title').textContent = titulo;
      document.getElementById('confirm-subtitle').textContent = subtitulo;
      document.getElementById('confirm-message').textContent = mensagem;
      document.getElementById('confirm-yes-btn').textContent = textoSim;
      document.getElementById('confirm-no-btn').textContent = textoNao;
      openModal('confirmacao');
    }
    function closeConfirmacao() { pendingConfirmAction = null; closeModal('confirmacao'); }
    async function confirmarAcao() {
      const action = pendingConfirmAction;
      pendingConfirmAction = null;
      closeModal('confirmacao');
      if (typeof action === 'function') {
        try { await action(); } catch (err) { handleAsyncError(err, 'Erro ao confirmar ação.'); }
      }
    }

    document.querySelectorAll('.modal-overlay').forEach(o => { o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); }); });

    // ─── UTILS ───────────────────────────────────────────────────────────────────
    function fmt(v) { return 'R$ ' + (v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
    function fmtDate(iso) { if (!iso) return '—'; const d = new Date(iso); if (Number.isNaN(d.getTime())) return '—'; return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`; }
    function fmtOnlyDate(iso) { if (!iso) return '—'; return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
    function formatMesAno(key) { const [ano, mes] = key.split('-'); const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']; return `${meses[parseInt(mes) - 1]} / ${ano}`; }
    function formatMoneyInputValue(value) { return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    function parseMoneyInputValue(value) { const n = String(value || '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.'); const p = parseFloat(n); return isNaN(p) ? 0 : p; }
    function formatMoneyField(el) { let value = el.value.replace(/\D/g, ''); if (!value) { el.value = ''; return; } el.value = (parseInt(value, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

    // ─── PRODUTOS & ESTOQUE (MANTIDO COMPACTO) ──────────────────────────────────
    function openCadastroProdutoModal() { clearCadastroForm(); openModal('cadastro-produto'); }
    function selectProductKind(kind) { productKind = kind; const isUnit = kind === 'unitario'; document.getElementById('cad-unitario').checked = isUnit; document.getElementById('cad-kit').checked = !isUnit; document.getElementById('card-unitario').classList.toggle('selected', isUnit); document.getElementById('card-kit').classList.toggle('selected', !isUnit); }
    function clearCadastroForm() { document.getElementById('cad-name').value = ''; document.getElementById('cad-sku').value = ''; selectProductKind('unitario'); }
    async function saveCadastroProduto() {
      const name = document.getElementById('cad-name').value.trim();
      const code = document.getElementById('cad-sku').value.trim();
      if (!name || !code) { showToast('warning', 'Campo obrigatório', 'Nome e SKU são obrigatórios.'); return; }
      const skus = loadSkus();
      if (skus.find(s => (s.code || '').toLowerCase() === code.toLowerCase())) { showToast('error', 'SKU duplicado', 'Já existe um produto com este SKU.'); return; }

      const newId = makeId();
      const novoProduto = {
        id: newId, name, code, kind: productKind, emoji: productKind === 'kit' ? '🧩' : '📦',
        cost: 0, packageCost: 0, tax: 'Padrão da conta', qty: 0, min: 5, ads: 0,
        sync: false, createdAt: new Date().toISOString()
      };

      try {
        assertSupabase();
        const { error } = await db.from('produtos').insert(mapSkuToDb(novoProduto));
        if (error) throw error;
        appData.skus.push(novoProduto);
        closeModal('cadastro-produto');
        showToast('success', 'Produto cadastrado', `${name} foi criado com sucesso.`);
        renderKpis(); renderTable(); openProductDetail(newId);
      } catch (err) { handleAsyncError(err, 'Erro ao cadastrar produto.'); }
    }
    const bagIconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
    const cartIconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';
    function renderTable() { const skus = loadSkus(); const q = document.getElementById('search-input').value.toLowerCase(); const qtyFilterEl = document.getElementById('filter-qty'); const minQty = qtyFilterEl ? parseInt(qtyFilterEl.value, 10) : NaN; const superF = document.getElementById('filter-super') ? document.getElementById('filter-super').value : 'ambos'; const anuncioF = document.getElementById('filter-anunciado') ? document.getElementById('filter-anunciado').value : 'todos'; const filtered = skus.filter(s => { const match = s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q); if (!match) return false; if (!isNaN(minQty) && s.qty < minQty) return false; if (superF === 'super' && !s.super) return false; if (superF === 'normal' && s.super) return false; if (anuncioF === 'anunciado' && !s.anunciado) return false; if (anuncioF === 'nao' && s.anunciado) return false; return true; }); const body = document.getElementById('table-body'); if (filtered.length === 0) { body.innerHTML = `<div class="empty-state"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.3; display:block; color: var(--text-muted);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg><p>Nenhum produto encontrado.</p></div>`; return; } const movs = loadMovs(); body.innerHTML = filtered.map(s => { const cls = s.qty === 0 ? 'stock-zero' : s.qty <= s.min ? 'stock-low' : 'stock-ok'; const total = s.qty * s.cost; const lastMov = movs.find(m => idsMatch(m.skuId, s.id)); const lastDate = lastMov ? fmtDate(lastMov.date) : '—'; return ` <div class="table-row"> <div></div> <div class="product-cell"> <div class="product-img">${s.emoji}</div> <div> <button class="product-link" onclick="openProductDetail('${s.id}')">${s.name}</button> <span class="product-sku">${s.code}</span> </div> </div> <div><div class="stock-val ${cls}">${s.qty}</div><div class="stock-unit">unidades</div></div> <div class="cell-muted">${fmt(s.cost)}</div> <div class="cell-muted">${fmt(total)}</div> <div class="cell-muted">${lastDate}</div> <div class="actions-cell"> <button class="mini-view-btn" onclick="openProductDetail('${s.id}')">Ver</button> <button class="mini-cart-btn ${s.super ? 'active' : ''}" title="${s.super ? 'Remover supermercado' : 'Marcar como supermercado'}" onclick="toggleSupermercado('${s.id}', event)">${cartIconSvg}</button> <button class="mini-bag-btn ${s.anunciado ? 'active' : ''}" title="${s.anunciado ? 'Remover anúncio' : 'Marcar como anunciado'}" onclick="toggleAnunciado('${s.id}', event)">${bagIconSvg}</button> </div> </div>`; }).join(''); }
    function openProductDetail(skuId) { currentProductId = skuId; detailMovFilter = 'todos'; navigate('produto-detalhe'); }
    function idsMatch(a, b) { return String(a) === String(b); }
    function getCurrentSku() { const skus = loadSkus(); let sku = skus.find(s => idsMatch(s.id, currentProductId)); if (sku) return sku; const detailSkuEl = document.getElementById('detail-sku'); const codeOnScreen = detailSkuEl ? detailSkuEl.textContent.trim() : ''; sku = skus.find(s => (s.code || '').trim() === codeOnScreen); if (sku) { currentProductId = sku.id; return sku; } return null; }
    function computeAverageCost(entradas) {
      let totalQty = 0, totalCusto = 0;
      entradas.forEach(m => {
        const q = Number(m.qty) || 0;
        const c = Number(m.cost) || 0;
        totalQty += q;
        totalCusto += q * c;
      });
      return totalQty > 0 ? (totalCusto / totalQty) : 0;
    }
    function monthKey(iso) { const d = new Date(iso); if (Number.isNaN(d.getTime())) return null; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
    function monthLabel(key) { const [y, m] = key.split('-').map(Number); const d = new Date(y, m - 1, 1); const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return label.charAt(0).toUpperCase() + label.slice(1); }
    const MESES_LABELS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    function selectMovTab(tab) {
      currentMovTab = tab === 'saida' ? 'saida' : 'entrada';
      document.getElementById('tab-mov-entrada').classList.toggle('active', currentMovTab === 'entrada');
      document.getElementById('tab-mov-saida').classList.toggle('active', currentMovTab === 'saida');
      salvarUltimaPagina('movimentacoes');
      renderMovimentacoes();
    }

    function renderMovimentacoes() {
      const skus = loadSkus();
      const movs = loadMovs();
      const q = (document.getElementById('movs-search').value || '').toLowerCase();
      const tipo = currentMovTab === 'saida' ? 'saida' : 'entrada';
      const isEntrada = tipo === 'entrada';

      document.getElementById('movs-subtitle').textContent = isEntrada
        ? 'Todas as movimentações de entrada registradas'
        : 'Todas as movimentações de saída registradas';
      document.getElementById('movs-kpi-produtos-label').textContent = isEntrada ? 'Total de Entradas' : 'Total de Saídas';
      document.getElementById('movs-kpi-produtos-sub').textContent = `registros no filtro atual`;
      document.getElementById('movs-kpi-recentes-label').textContent = `${isEntrada ? 'Entradas' : 'Saídas'} nos últimos 7 dias`;
      document.getElementById('movs-kpi-recentes').style.color = isEntrada ? 'var(--green)' : 'var(--danger)';
      document.getElementById('movs-kpi-unidades-label').textContent = `Unidades ${isEntrada ? 'recebidas' : 'expedidas'} (7 dias)`;
      document.getElementById('movs-kpi-unidades-sub').textContent = `unidades ${isEntrada ? 'entraram no' : 'saíram do'} estoque`;

      const allDoTipo = movs.filter(m => m.type === tipo);
      const skuById = new Map(skus.map(s => [String(s.id), s]));
      // Custo médio (histórico de entradas) por produto, calculado uma vez para
      // reutilizar em cada card de entrada, sem refazer o filtro a cada linha.
      const entradasPorSku = new Map();
      if (isEntrada) {
        movs.filter(m => m.type === 'entrada').forEach(m => {
          const key = String(m.skuId);
          if (!entradasPorSku.has(key)) entradasPorSku.set(key, []);
          entradasPorSku.get(key).push(m);
        });
      }

      // Filtro de Ano (dinâmico, com base nos dados existentes)
      const years = [...new Set(allDoTipo.map(m => { const d = new Date(m.date); return Number.isNaN(d.getTime()) ? null : d.getFullYear(); }).filter(Boolean))].sort((a, b) => b - a);
      const yearOptions = [{ value: 'todos', label: 'Todos os anos' }, ...years.map(y => ({ value: String(y), label: String(y) }))];
      const currentAnoSelect = document.getElementById('filter-ano-mov');
      const selectedAno = currentAnoSelect ? currentAnoSelect.value : 'todos';
      rebuildCustomSelect('cs-filter-ano-mov', yearOptions, selectedAno);
      const anoFilter = document.getElementById('filter-ano-mov').value || 'todos';

      // Filtro de Mês (fixo, Janeiro a Dezembro)
      const mesOptions = [{ value: 'todos', label: 'Todos os meses' }, ...MESES_LABELS.map((label, idx) => ({ value: String(idx + 1), label }))];
      const currentMesSelect = document.getElementById('filter-mes-mov');
      const selectedMes = currentMesSelect ? currentMesSelect.value : 'todos';
      rebuildCustomSelect('cs-filter-mes-mov', mesOptions, selectedMes);
      const mesFilter = document.getElementById('filter-mes-mov').value || 'todos';

      // Cada movimentação vira uma linha própria — nada é agrupado/oculto por
      // produto, então uma saída de 5 seguida de uma saída de 10 aparecem as duas.
      const rows = allDoTipo.map(m => {
        const sku = skuById.get(String(m.skuId)) || { id: m.skuId, name: m.skuName || 'Produto removido', code: '—', emoji: '📦' };
        const avgCost = isEntrada ? computeAverageCost(entradasPorSku.get(String(m.skuId)) || []) : 0;
        return { sku, mov: m, avgCost };
      })
        .filter(r => !q || r.sku.name.toLowerCase().includes(q) || (r.sku.code || '').toLowerCase().includes(q))
        .filter(r => {
          const d = new Date(r.mov.date);
          if (Number.isNaN(d.getTime())) return mesFilter === 'todos' && anoFilter === 'todos';
          const okMes = mesFilter === 'todos' || (d.getMonth() + 1) === Number(mesFilter);
          const okAno = anoFilter === 'todos' || d.getFullYear() === Number(anoFilter);
          return okMes && okAno;
        });

      rows.sort((a, b) => new Date(b.mov.date) - new Date(a.mov.date));

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentes = allDoTipo.filter(m => new Date(m.date) >= sevenDaysAgo);
      document.getElementById('movs-kpi-produtos').textContent = rows.length;
      document.getElementById('movs-kpi-recentes').textContent = recentes.length;
      document.getElementById('movs-kpi-unidades').textContent = recentes.reduce((a, m) => a + (Number(m.qty) || 0), 0);

      const grid = document.getElementById('movs-grid');
      if (!rows.length) {
        grid.innerHTML = `<div class="empty-state"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.3; display:block; color: var(--text-muted);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg><p>Nenhuma movimentação de ${isEntrada ? 'entrada' : 'saída'} encontrada.</p></div>`;
        return;
      }

      grid.innerHTML = rows.map(r => {
        const s = r.sku, m = r.mov;
        const corSinal = isEntrada ? 'var(--green)' : 'var(--danger)';
        const statsHtml = isEntrada ? `
          <div>
            <div class="entrada-card-stat-label">Qtd. recebida</div>
            <div class="entrada-card-stat-value" style="color:${corSinal}">+${m.qty} un</div>
          </div>
          <div>
            <div class="entrada-card-stat-label">Custo p/ Unid</div>
            <div class="entrada-card-stat-value">${fmt(m.cost || 0)}</div>
          </div>
          <div>
            <div class="entrada-card-stat-label">Estoque após</div>
            <div class="entrada-card-stat-value">${m.qtyAfter !== undefined ? m.qtyAfter + ' un' : '—'}</div>
          </div>
          <div>
            <div class="entrada-card-stat-label">Custo médio</div>
            <div class="entrada-card-stat-value">${fmt(r.avgCost)}</div>
          </div>` : `
          <div>
            <div class="entrada-card-stat-label">Qtd. retirada</div>
            <div class="entrada-card-stat-value" style="color:${corSinal}">-${m.qty} un</div>
          </div>
          <div>
            <div class="entrada-card-stat-label">Valor da baixa</div>
            <div class="entrada-card-stat-value">${fmt((m.qty || 0) * (m.cost || 0))}</div>
          </div>
          <div>
            <div class="entrada-card-stat-label">Estoque após</div>
            <div class="entrada-card-stat-value">${m.qtyAfter !== undefined ? m.qtyAfter + ' un' : '—'}</div>
          </div>
          <div>
            <div class="entrada-card-stat-label">Motivo</div>
            <div class="entrada-card-stat-value" style="font-size:12px">${escapeHtml(m.note || '—')}</div>
          </div>`;
        return `
      <div class="entrada-card">
        <div class="entrada-card-top">
          <div class="entrada-card-emoji">${s.emoji || '📦'}</div>
          <div>
            <div class="entrada-card-name">${escapeHtml(s.name)}</div>
            <div class="entrada-card-sku">${escapeHtml(s.code)}</div>
          </div>
        </div>
        <div class="entrada-card-date">${isEntrada ? 'Entrada em' : 'Saída em'} ${fmtDate(m.date)}</div>
        <div class="entrada-card-body">${statsHtml}
        </div>
        <div class="entrada-card-footer">
          <button class="mini-view-btn" onclick="openProductDetail('${s.id}')">Ver produto</button>
        </div>
      </div>`;
      }).join('');
    }
    function renderProductDetail() { const sku = getCurrentSku(); if (!sku) { navigate('estoque'); return; } const movs = loadMovs().filter(m => idsMatch(m.skuId, sku.id)); const entradas = movs.filter(m => m.type === 'entrada'); const saidas = movs.filter(m => m.type === 'saida'); const stockValue = sku.qty * sku.cost; document.getElementById('detail-emoji').textContent = sku.emoji || '📦'; document.getElementById('detail-name').textContent = sku.name; document.getElementById('detail-sku').textContent = sku.code; document.getElementById('detail-created').textContent = fmtOnlyDate(sku.createdAt); document.getElementById('detail-kind').textContent = (sku.kind === 'kit') ? 'KIT' : 'Unitário'; document.getElementById('detail-qty-pill').textContent = `${sku.qty} unidades`; document.getElementById('detail-stock-value-pill').textContent = `${fmt(stockValue)} em estoque`; const anunciadoPill = document.getElementById('detail-anunciado-pill'); anunciadoPill.style.display = sku.anunciado ? '' : 'none'; document.getElementById('detail-average-cost').textContent = fmt(sku.cost || 0); const avgPurchaseCost = computeAverageCost(entradas); document.getElementById('detail-avg-purchase-cost').textContent = fmt(avgPurchaseCost); const avgSub = document.getElementById('detail-avg-purchase-sub'); if (!entradas.length) { avgSub.textContent = 'Sem entradas registradas'; } else { const diff = (sku.cost || 0) - avgPurchaseCost; const diffTxt = diff > 0.005 ? ` · ${fmt(Math.abs(diff))} acima do custo atual` : diff < -0.005 ? ` · ${fmt(Math.abs(diff))} abaixo do custo atual` : ' · igual ao custo atual'; avgSub.textContent = `Baseado em ${entradas.length} entrada${entradas.length === 1 ? '' : 's'}${diffTxt}`; } document.getElementById('filter-todos').textContent = `Todos (${movs.length})`; document.getElementById('filter-entrada').textContent = `Entradas (${entradas.length})`; document.getElementById('filter-saida').textContent = `Saídas (${saidas.length})`; document.getElementById('filter-todos').classList.toggle('active', detailMovFilter === 'todos'); document.getElementById('filter-entrada').classList.toggle('active', detailMovFilter === 'entrada'); document.getElementById('filter-saida').classList.toggle('active', detailMovFilter === 'saida'); renderDetailMovements(movs); renderDetailCosts(entradas); }
    function renderDetailMovements(movs) { const box = document.getElementById('detail-movements-box'); const filtered = movs.filter(m => detailMovFilter === 'todos' ? true : m.type === detailMovFilter); if (filtered.length === 0) { box.classList.remove('has-items'); box.textContent = 'Nenhuma movimentação registrada'; return; } box.classList.add('has-items'); box.innerHTML = filtered.map(m => { const isEntrada = m.type === 'entrada'; const metaParts = [fmtDate(m.date)]; if (isEntrada) metaParts.push('Entrada de estoque'); else metaParts.push('Saída de estoque'); if (m.note && m.note !== 'Entrada de estoque' && m.note !== 'Saída de estoque') metaParts.push(m.note); if (m.notes) metaParts.push(m.notes); if (m.qtyAfter !== undefined) metaParts.push(`Estoque após: ${m.qtyAfter} un`); if (isEntrada && m.cost) metaParts.push(`Custo p/ Unid: ${fmt(m.cost)}`); return ` <div class="detail-mov-row"> <div class="mov-badge ${isEntrada ? 'in' : 'out'}">${isEntrada ? '📦' : '🚚'}</div> <div class="detail-mov-info"> <strong>${isEntrada ? 'Entrada' : 'Saída'} de ${m.qty} unidade${m.qty === 1 ? '' : 's'}</strong> <span>${metaParts.join(' · ')}</span> </div> <div style="text-align:right"> <div class="mov-qty ${isEntrada ? 'in' : 'out'}">${isEntrada ? '+' : '-'}${m.qty}</div> </div> </div>`; }).join(''); }
    function renderDetailCosts(entradas) { const box = document.getElementById('detail-costs-box'); if (!entradas.length) { box.classList.remove('has-items'); box.textContent = 'Nenhum histórico de custo registrado'; return; } box.classList.add('has-items'); box.innerHTML = entradas.map(m => { const prevCost = m.previousCost !== undefined ? m.previousCost : null; const costChanged = prevCost !== null && prevCost !== m.cost; return ` <div class="detail-mov-row"> <div class="mov-badge in">$</div> <div class="detail-mov-info"> <strong>${fmt(m.cost || 0)} / unidade${costChanged ? ' ↑' : ''}</strong> <span>${fmtDate(m.date)} · ${m.qty} unidade${m.qty === 1 ? '' : 's'} entrada</span> </div> <div style="text-align:right;font-size:12px;color:var(--text-muted)">${costChanged ? fmt(prevCost) + ' → ' + fmt(m.cost) : fmt(m.cost)}</div> </div>`; }).join(''); }
    function selectEditProductKind(kind) { editProductKind = kind; const isUnit = kind === 'unitario'; document.getElementById('edit-prod-unitario').checked = isUnit; document.getElementById('edit-prod-kit').checked = !isUnit; document.getElementById('edit-card-unitario').classList.toggle('selected', isUnit); document.getElementById('edit-card-kit').classList.toggle('selected', !isUnit); }
    function openEditProductModal() { const sku = getCurrentSku(); if (!sku) return; document.getElementById('edit-prod-name').value = sku.name || ''; document.getElementById('edit-prod-sku').value = sku.code || ''; selectEditProductKind(sku.kind === 'kit' ? 'kit' : 'unitario'); openModal('edit-product'); }
    function closeEditProductModal() { closeModal('edit-product'); }
    function openRedefinirCustoModal() {
      const sku = getCurrentSku();
      if (!sku) { alert('Produto não encontrado.'); return; }
      document.getElementById('redefinir-custo-valor').value = formatMoneyInputValue(sku.cost || 0);
      document.getElementById('redefinir-custo-qty').value = sku.qty || 0;
      openModal('redefinir-custo');
    }
    function closeRedefinirCustoModal() { closeModal('redefinir-custo'); }
    async function saveRedefinirCusto() {
      const sku = getCurrentSku();
      if (!sku) { showToast('error', 'Erro', 'Produto não encontrado.'); return; }
      const novoCusto = parseMoneyInputValue(document.getElementById('redefinir-custo-valor').value);
      const novaQty = parseInt(document.getElementById('redefinir-custo-qty').value, 10);
      if (isNaN(novoCusto) || novoCusto < 0) { showToast('warning', 'Campo inválido', 'Informe um custo médio válido.'); return; }
      if (isNaN(novaQty) || novaQty < 0) { showToast('warning', 'Campo inválido', 'Informe uma quantidade válida.'); return; }
      try {
        await updateRowById('produtos', 'skus', currentProductId,
          { cost: novoCusto, qty: novaQty },
          { cost: novoCusto, qty: novaQty });
        closeRedefinirCustoModal();
        showToast('success', 'Custo médio redefinido', `Novo custo: ${fmt(novoCusto)} · Quantidade: ${novaQty}`);
        renderProductDetail(); renderKpis(); renderTable(); renderDashboard();
      } catch (err) { handleAsyncError(err, 'Erro ao redefinir custo médio.'); }
    }
    async function saveEditedProduct() {
      const name = document.getElementById('edit-prod-name').value.trim();
      const code = document.getElementById('edit-prod-sku').value.trim();
      if (!name || !code) { showToast('warning', 'Campo obrigatório', 'Nome e SKU são obrigatórios.'); return; }
      const skus = loadSkus();
      const idx = skus.findIndex(s => idsMatch(s.id, currentProductId));
      if (idx === -1) { showToast('error', 'Erro', 'Produto não encontrado.'); return; }
      const dup = skus.find(s => !idsMatch(s.id, currentProductId) && (s.code || '').toLowerCase() === code.toLowerCase());
      if (dup) { showToast('error', 'SKU duplicado', 'Já existe outro produto com este SKU.'); return; }

      const emoji = editProductKind === 'kit' ? '🧩' : (skus[idx].emoji || '📦');

      try {
        await updateRowById('produtos', 'skus', currentProductId,
          { name, code, kind: editProductKind, emoji },
          { name, code, kind: editProductKind, emoji });

        // Atualiza o nome do SKU nas movimentações já registradas, direto no
        // banco (update pontual), sem reenviar a tabela inteira.
        assertSupabase();
        const { error: movErr } = await db.from('movimentacoes').update({ sku_name: name }).eq('sku_id', currentProductId);
        if (movErr) throw movErr;
        appData.movs = appData.movs.map(m => idsMatch(m.skuId, currentProductId) ? { ...m, skuName: name } : m);

        closeEditProductModal();
        showToast('success', 'Produto atualizado', 'As alterações foram salvas.');
        renderProductDetail(); renderKpis(); renderTable(); renderDashboard();
      } catch (err) { handleAsyncError(err, 'Erro ao salvar produto.'); }
    }
    async function toggleAnunciado(id, event) {
      if (event) event.stopPropagation();
      const sku = loadSkus().find(s => idsMatch(s.id, id));
      if (!sku) return;
      const novoValor = !sku.anunciado;
      try {
        await updateRowById('produtos', 'skus', id, { anunciado: novoValor }, { anunciado: novoValor });
        showToast('success', novoValor ? 'Produto anunciado' : 'Anúncio removido', novoValor ? 'O produto agora aparece em Itens Anunciados.' : 'O produto não aparece mais em Itens Anunciados.');
        renderTable();
        if (document.getElementById('page-produto-detalhe').classList.contains('active')) renderProductDetail();
        renderAnunciados();
      } catch (err) { handleAsyncError(err, 'Erro ao atualizar status de anúncio.'); }
    }

    async function toggleSupermercado(id, event) {
      if (event) event.stopPropagation();
      const sku = loadSkus().find(s => idsMatch(s.id, id));
      if (!sku) return;
      const novoValor = !sku.super;
      try {
        await updateRowById('produtos', 'skus', id, { super: novoValor }, { super: novoValor });
        showToast('success', novoValor ? 'Marcado como Supermercado' : 'Removido de Supermercado', novoValor ? 'O produto agora é de supermercado.' : 'O produto voltou ao normal.');
        renderTable();
        if (document.getElementById('page-produto-detalhe').classList.contains('active')) renderProductDetail();
      } catch (err) { handleAsyncError(err, 'Erro ao atualizar status de supermercado.'); }
    }

    function renderAnunciados() {
      const grid = document.getElementById('anunciados-grid');
      if (!grid) return;
      const items = loadSkus().filter(s => s.anunciado);
      if (items.length === 0) {
        grid.innerHTML = `<div class="empty-state"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.3; display:block; color: var(--text-muted);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg><p>Nenhum item anunciado ainda. Clique no ícone de sacola ao lado de um produto em Estoque para marcá-lo como anunciado.</p></div>`;
        return;
      }
      grid.innerHTML = items.map(s => `
    <div class="entrada-card">
      <div class="entrada-card-top">
        <div class="entrada-card-emoji">${s.emoji || '📦'}</div>
        <div>
          <button class="product-link entrada-card-name" onclick="openProductDetail('${s.id}')">${s.name}</button>
          <div class="entrada-card-sku">${s.code}</div>
        </div>
      </div>
      <div class="entrada-card-body">
        <div>
          <div class="entrada-card-stat-label">Custo Médio</div>
          <div class="entrada-card-stat-value">${fmt(s.cost || 0)}</div>
        </div>
        <div>
          <div class="entrada-card-stat-label">Estoque atual</div>
          <div class="entrada-card-stat-value">${s.qty} un</div>
        </div>
      </div>
      <div class="entrada-card-footer">
        <button class="mini-view-btn" onclick="openProductDetail('${s.id}')">Ver produto</button>
        <button class="mini-bag-btn active" title="Remover anúncio" onclick="toggleAnunciado('${s.id}', event)">${bagIconSvg}</button>
      </div>
    </div>
  `).join('');
    }

    function setDetailMovFilter(filter) { detailMovFilter = filter; renderProductDetail(); }
    function selectDetailTab(tab) { document.getElementById('tab-movs').classList.toggle('active', tab === 'movs'); document.getElementById('tab-costs').classList.toggle('active', tab === 'costs'); document.getElementById('detail-movs-tab').classList.toggle('hidden', tab !== 'movs'); document.getElementById('detail-costs-tab').classList.toggle('hidden', tab !== 'costs'); }
    function selectDetailMovType(type) { detailMovType = type; document.getElementById('prod-type-entrada').classList.toggle('selected', type === 'entrada'); document.getElementById('prod-type-saida').classList.toggle('selected', type === 'saida'); const costField = document.getElementById('prod-cost-field'); const costInput = document.getElementById('prod-mov-cost'); if (type === 'saida') { costField.style.display = 'none'; costInput.value = ''; } else { costField.style.display = ''; const sku = getCurrentSku(); if (sku) costInput.value = formatMoneyInputValue(sku.cost || 0); } }
    function openDetailMovModal() {
      const sku = getCurrentSku();
      if (!sku) { alert('Produto não encontrado.'); return; }

      // Chave de idempotência única para esta intenção de movimentação.
      // Enviada ao banco junto com o registro; se por algum motivo a mesma
      // ação for reenviada (ex: retry de rede), o banco reconhece e não
      // duplica a movimentação nem mexe no estoque de novo.
      movClientRef = makeId();

      const qtyEl = document.getElementById('prod-mov-qty');
      const costEl = document.getElementById('prod-mov-cost');
      const reasonEl = document.getElementById('prod-mov-reason');
      const notesEl = document.getElementById('prod-mov-notes');

      if (qtyEl) qtyEl.value = 1;
      if (costEl) costEl.value = formatMoneyInputValue(sku.cost || 0);
      if (reasonEl) reasonEl.value = '';
      if (notesEl) notesEl.value = '';

      selectDetailMovType('entrada');
      openModal('prod-mov');
    }
    function closeProductMovModal() { closeModal('prod-mov'); }
    let isSavingMovimentacao = false;
    async function saveDetailMovimentacao() {
      // Trava de reentrância: evita que um duplo clique (ou um clique repetido
      // enquanto a rede ainda responde) dispare duas chamadas RPC e gere
      // movimentação duplicada / estoque incorreto.
      if (isSavingMovimentacao) return;
      isSavingMovimentacao = true;
      setButtonLoading('btn-save-movimentacao', true);

      try {
        const qty = parseInt(document.getElementById('prod-mov-qty').value, 10);
        const sku = getCurrentSku();
        if (!sku) { alert('Produto não encontrado.'); return; }

        const costInput = document.getElementById('prod-mov-cost');
        const reasonInput = document.getElementById('prod-mov-reason');
        const notesInput = document.getElementById('prod-mov-notes');
        const cost = detailMovType === 'entrada'
          ? (parseMoneyInputValue(costInput ? costInput.value : '') || Number(sku.cost) || 0)
          : (Number(sku.cost) || 0);
        const reason = reasonInput ? reasonInput.value.trim() : '';
        const notes = notesInput ? notesInput.value.trim() : '';

        const result = await createMovementForSku({
          skuId: currentProductId,
          type: detailMovType,
          qty,
          cost,
          note: reason || (detailMovType === 'entrada' ? 'Entrada de estoque' : 'Saída de estoque'),
          notes,
          clientRef: movClientRef
        });
        if (!result.ok) { alert(result.message); return; }
        movClientRef = null;
        closeProductMovModal();
        showToast('success', 'Movimentação registrada', `${detailMovType === 'entrada' ? 'Entrada' : 'Saída'} salva no estoque.`);
        renderProductDetail(); renderKpis(); renderTable(); renderDashboard();
      } catch (err) { handleAsyncError(err, 'Erro ao salvar movimentação.'); }
      finally {
        isSavingMovimentacao = false;
        setButtonLoading('btn-save-movimentacao', false, 'Salvar');
      }
    }
    async function createMovementForSku({ skuId, type, qty, cost = 0, note = '', notes = '', clientRef = null }) {
      const sku = loadSkus().find(s => idsMatch(s.id, skuId));
      if (!sku) return { ok: false, message: 'Produto não encontrado.' };
      const movementQty = Number(qty) || 0;
      const movementCost = Number(cost) || Number(sku.cost) || 0;
      if (!movementQty || movementQty < 1) return { ok: false, message: 'Informe uma quantidade válida.' };
      if (type === 'saida' && (Number(sku.qty) || 0) < movementQty) return { ok: false, message: `Estoque insuficiente! Disponível: ${sku.qty} unidades.` };

      assertSupabase();
      const { error } = await db.rpc('registrar_movimentacao', {
        p_sku_id: skuId,
        p_type: type,
        p_qty: movementQty,
        p_cost: movementCost,
        p_note: note || '',
        p_notes: notes || '',
        p_client_ref: clientRef || null
      });
      if (error) return { ok: false, message: error.message };

      await loadAllData();
      const updatedSku = loadSkus().find(s => idsMatch(s.id, skuId));
      return { ok: true, sku: updatedSku };
    }
    function getCurrentProductForDelete() { const skus = loadSkus(); if (currentProductId) { const f = skus.find(s => String(s.id) === String(currentProductId)); if (f) return f; } const el = document.getElementById('detail-sku'); if (el) { const code = el.textContent.trim(); const f = skus.find(s => String(s.code).trim() === code); if (f) { currentProductId = f.id; return f; } } return null; }
    function openDeleteProductModal() {
      const sku = getCurrentProductForDelete();
      if (!sku) { alert('Produto não encontrado para exclusão.'); return; }

      const nameEl = document.getElementById('delete-product-name');
      const skuEl = document.getElementById('delete-product-sku');
      if (nameEl) nameEl.textContent = sku.name || 'Produto';
      if (skuEl) skuEl.textContent = sku.code || '—';

      openModal('delete-product');
    }
    function closeDeleteProductModal() { closeModal('delete-product'); }
    async function confirmDeleteProduct() {
      const sku = getCurrentProductForDelete();
      if (!sku) { closeDeleteProductModal(); alert('Produto não encontrado.'); return; }
      const idToDelete = String(sku.id);
      try {
        await deleteById('produtos', 'skus', idToDelete);
        appData.movs = appData.movs.filter(m => String(m.skuId) !== idToDelete);
        currentProductId = null;
        closeDeleteProductModal();
        showToast('success', 'Produto excluído', 'O registro foi removido do estoque.');
        renderKpis(); renderTable(); renderDashboard(); navigate('estoque');
      } catch (err) { handleAsyncError(err, 'Erro ao excluir produto.'); }
    }
    function renderKpis() { const skus = loadSkus(); const movs = loadMovs(); const units = skus.reduce((a, s) => a + s.qty, 0); const cost = skus.reduce((a, s) => a + s.qty * s.cost, 0); const zero = skus.filter(s => s.qty === 0).length; const now = new Date(); const monthIn = movs.filter(m => m.type === 'entrada' && new Date(m.date).getMonth() === now.getMonth()).reduce((a, m) => a + m.qty, 0); document.getElementById('kpi-units').textContent = units; document.getElementById('kpi-skus-sub').textContent = `Total de ${skus.length} SKUs`; document.getElementById('kpi-cost').textContent = fmt(cost); document.getElementById('kpi-zero').textContent = zero; document.getElementById('kpi-in').textContent = monthIn; const zeroAlert = document.getElementById('zero-alert'); if (zero > 0) { zeroAlert.style.display = ''; document.getElementById('zero-alert-msg').textContent = `Você tem ${zero} produto(s) sem estoque.`; } else { zeroAlert.style.display = 'none'; } }
    function renderDashboard() {
      const skus = loadSkus();
      const movs = loadMovs();
      const totalSkus = skus.length;
      const units = skus.reduce((a, s) => a + (Number(s.qty) || 0), 0);
      const stockCost = skus.reduce((a, s) => a + ((Number(s.qty) || 0) * (Number(s.cost) || 0)), 0);
      const zero = skus.filter(s => (Number(s.qty) || 0) === 0).length;
      const low = skus.filter(s => (Number(s.qty) || 0) > 0 && (Number(s.qty) || 0) <= (Number(s.min) || 5)).length;
      const now = new Date();
      const monthOut = movs
        .filter(m => m.type === 'saida' && new Date(m.date).getMonth() === now.getMonth() && new Date(m.date).getFullYear() === now.getFullYear())
        .reduce((a, m) => a + (Number(m.qty) || 0), 0);

      const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
      setText('dash-skus', totalSkus);
      setText('dash-units', units);
      setText('dash-cost', fmt(stockCost));
      setText('dash-zero', zero);
      setText('dash-low', low);
      setText('dash-month-out', monthOut);

      const attention = skus
        .filter(s => (Number(s.qty) || 0) === 0 || ((Number(s.qty) || 0) > 0 && (Number(s.qty) || 0) <= (Number(s.min) || 5)))
        .sort((a, b) => (Number(a.qty) || 0) - (Number(b.qty) || 0))
        .slice(0, 7);
      const attentionBox = document.getElementById('dash-attention');
      if (attentionBox) {
        if (!attention.length) {
          attentionBox.innerHTML = `<div class="empty-state" style="padding:22px 10px"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.3; display:block; color: var(--text-muted);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg><p>Nenhum produto crítico.</p></div>`;
        } else {
          attentionBox.innerHTML = attention.map(s => {
            const isZero = (Number(s.qty) || 0) === 0;
            return `<div class="attention-item" onclick="openProductDetail('${s.id}')" style="cursor:pointer">
          <div><strong>${escapeHtml(s.name)}</strong><span>${escapeHtml(s.code)} · mínimo ${s.min || 5}</span></div>
          <span class="attention-badge ${isZero ? 'zero' : 'low'}">${isZero ? 'Zerado' : `${s.qty} un.`}</span>
        </div>`;
          }).join('');
        }
      }

      const recent = movs.slice(0, 8);
      const container = document.getElementById('dash-movs');
      if (!container) return;
      if (recent.length === 0) {
        container.innerHTML = `<div class="empty-state"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.3; display:block; color: var(--text-muted);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg><p>Nenhuma movimentação ainda.</p></div>`;
        return;
      }
      
      // -- INÍCIO GRÁFICO DASHBOARD --
      const ctxDash = document.getElementById('dashboardChart');
      if (ctxDash) {
        if (window.dashboardChartInstance) window.dashboardChartInstance.destroy();
        const labels = []; const inData = []; const outData = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
          const dayStr = d.toISOString().slice(0, 10);
          const dIns = movs.filter(m => m.type === 'entrada' && m.date && m.date.startsWith(dayStr)).reduce((a, b) => a + (Number(b.qty) || 0), 0);
          const dOuts = movs.filter(m => m.type === 'saida' && m.date && m.date.startsWith(dayStr)).reduce((a, b) => a + (Number(b.qty) || 0), 0);
          inData.push(dIns); outData.push(dOuts);
        }
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const textColor = isLight ? '#64748b' : '#94a3b8';
        const gridColor = isLight ? '#e2e8f0' : '#334155';
        window.dashboardChartInstance = new Chart(ctxDash, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              { label: 'Entradas (Un)', data: inData, backgroundColor: '#10b981', borderRadius: 4 },
              { label: 'Saídas (Un)', data: outData, backgroundColor: '#ef4444', borderRadius: 4 }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: textColor, font: { family: 'Inter' } } } },
            scales: {
              y: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Inter' }, precision: 0 } },
              x: { grid: { display: false }, ticks: { color: textColor, font: { family: 'Inter' } } }
            }
          }
        });
      }
      // -- FIM GRÁFICO DASHBOARD --

      container.innerHTML = recent.map(m => `
    <div class="mov-item">
      <div class="mov-badge ${m.type === 'entrada' ? 'in' : 'out'}">${m.type === 'entrada' ? '📦' : '🚚'}</div>
      <div class="mov-info">
        <div class="mov-name">${escapeHtml(m.skuName)}</div>
        <div class="mov-meta">${m.type === 'entrada' ? 'Entrada' : 'Saída'} · ${escapeHtml(m.note || '—')}</div>
      </div>
      <div style="text-align:right">
        <div class="mov-qty ${m.type === 'entrada' ? 'in' : 'out'}">${m.type === 'entrada' ? '+' : '-'}${m.qty} un</div>
        <div class="mov-date">${fmtDate(m.date)}</div>
      </div>
    </div>`).join('');
    }

    // ─── COMPRAS ──────────────────────────────────────────────────────────────────
    function getCompraPaymentOptions() {
      const cartoes = loadCartoes();
      return [{ value: '', label: 'Caixa / Dinheiro' }].concat(
        cartoes.map(c => ({
          value: String(c.id || ''),
          label: `${c.nome || 'Cartão'}${c.digitos ? ` (Final ${c.digitos})` : ''}`
        }))
      );
    }

    function syncCompraPaymentSelect(selectedValue = '') {
      const normalizedValue = selectedValue === null || selectedValue === undefined ? '' : String(selectedValue);
      rebuildCustomSelect('cs-compra-cartao', getCompraPaymentOptions(), normalizedValue);
    }

    function getCompraContaOptions() {
      const contas = loadContas();
      return [{ value: '', label: 'Nenhuma conta selecionada' }].concat(
        contas.map(c => ({
          value: String(c.id || ''),
          label: `${c.plataforma || 'Conta'} — ${c.usuario || ''}`
        }))
      );
    }

    function syncCompraContaSelect(selectedValue = '') {
      const normalizedValue = selectedValue === null || selectedValue === undefined ? '' : String(selectedValue);
      rebuildCustomSelect('cs-compra-conta', getCompraContaOptions(), normalizedValue);
    }

    /* ── SKU CUSTOM SELECT (modal compra) ── */
    function getSkuSelectOptions() {
      const skus = loadSkus();
      const opts = skus.map(s => ({ value: s.code, label: `${s.code} — ${s.name}` }));
      return [
        { value: '__novo__', label: '+ Inserir SKU manualmente...' },
        ...opts
      ];
    }

    function syncCompraSkuSelect(code) {
      const opts = getSkuSelectOptions();
      rebuildCustomSelect('cs-compra-sku', opts, code || '');
      // Se vier um code que não existe nos SKUs cadastrados, mostra campo manual
      const exists = loadSkus().some(s => s.code === code);
      if (code && !exists) {
        showSkuManualInput(code);
      } else {
        hideSkuManualInput();
      }
    }

    function pickCompraSkuOption(value) {
      if (value === '__novo__') {
        showSkuManualInput('');
      } else {
        hideSkuManualInput();
        document.getElementById('compra-sku-hidden').value = value;
      }
    }

    function showSkuManualInput(prefill) {
      document.getElementById('compra-sku-manual-wrap').style.display = 'block';
      document.getElementById('compra-sku').value = prefill || '';
      document.getElementById('compra-sku-hidden').value = '';
    }

    function hideSkuManualInput() {
      document.getElementById('compra-sku-manual-wrap').style.display = 'none';
      document.getElementById('compra-sku').value = '';
    }

    function getCompraSkuValue() {
      const manualWrap = document.getElementById('compra-sku-manual-wrap');
      if (manualWrap.style.display !== 'none') {
        return document.getElementById('compra-sku').value.trim();
      }
      return document.getElementById('compra-sku-hidden').value.trim();
    }

    function openCompraModal() {
      editCompraId = null;
      document.getElementById('modal-compra-title').textContent = 'Nova Compra';
      document.getElementById('btn-save-compra').textContent = 'Registrar Compra';
      ['compra-nome', 'compra-link', 'cat-nome', 'cat-link', 'compra-qty', 'compra-total', 'compra-preco', 'compra-venda', 'compra-margem', 'compra-roi'].forEach(id => { document.getElementById(id).value = ''; });
      document.getElementById('compra-sku-hidden').value = '';
      hideSkuManualInput();
      document.getElementById('compra-parcelas').value = 1; calcCompraUnitPrice();
      syncCompraPaymentSelect('');
      syncCompraContaSelect('');
      syncCompraSkuSelect('');
      openModal('compra');
    }

    function openEditCompraModal(id) {
      const compra = loadCompras().find(c => c.id === id);
      if (!compra) return;
      editCompraId = id;
      document.getElementById('modal-compra-title').textContent = 'Editar Compra';
      document.getElementById('btn-save-compra').textContent = 'Salvar Alterações';
      syncCompraPaymentSelect(compra.cartaoId || '');
      syncCompraContaSelect(compra.contaId || '');
      syncCompraSkuSelect(compra.sku || '');
      document.getElementById('compra-nome').value = compra.compraNome || '';
      document.getElementById('compra-link').value = compra.compraLink || ''; document.getElementById('cat-nome').value = compra.catNome || '';
      document.getElementById('cat-link').value = compra.catLink || ''; document.getElementById('compra-qty').value = compra.qty || '';
      document.getElementById('compra-total').value = formatMoneyInputValue(compra.total || ((compra.qty || 0) * (compra.preco || 0)));
      document.getElementById('compra-preco').value = formatMoneyInputValue(compra.preco || 0);
      document.getElementById('compra-parcelas').value = compra.parcelas || 1; document.getElementById('compra-venda').value = formatMoneyInputValue(compra.venda || 0);
      document.getElementById('compra-margem').value = compra.margem || ''; document.getElementById('compra-roi').value = compra.roi || '';
      calcCompraUnitPrice(); openModal('compra');
    }

    function duplicateCompra(id) {
      const compra = loadCompras().find(c => c.id === id);
      if (!compra) return;
      editCompraId = null;
      document.getElementById('modal-compra-title').textContent = 'Duplicar Compra';
      document.getElementById('btn-save-compra').textContent = 'Registrar Compra';
      syncCompraPaymentSelect(compra.cartaoId || '');
      syncCompraContaSelect(compra.contaId || '');
      syncCompraSkuSelect(compra.sku || '');
      document.getElementById('compra-nome').value = compra.compraNome || '';
      document.getElementById('compra-link').value = compra.compraLink || ''; document.getElementById('cat-nome').value = compra.catNome || '';
      document.getElementById('cat-link').value = compra.catLink || ''; document.getElementById('compra-qty').value = compra.qty || '';
      document.getElementById('compra-total').value = formatMoneyInputValue(compra.total || ((compra.qty || 0) * (compra.preco || 0)));
      document.getElementById('compra-preco').value = formatMoneyInputValue(compra.preco || 0);
      document.getElementById('compra-parcelas').value = compra.parcelas || 1; document.getElementById('compra-venda').value = formatMoneyInputValue(compra.venda || 0);
      document.getElementById('compra-margem').value = compra.margem || ''; document.getElementById('compra-roi').value = compra.roi || '';
      calcCompraUnitPrice(); openModal('compra');
    }

    function calcCompraUnitPrice() {
      const qty = parseInt(document.getElementById('compra-qty').value) || 0;
      const total = parseMoneyInputValue(document.getElementById('compra-total').value) || 0;
      const precoUnitario = qty > 0 ? total / qty : 0;
      document.getElementById('compra-preco').value = precoUnitario > 0 ? formatMoneyInputValue(precoUnitario) : '';
    }

    function calcCompraTotal() { calcCompraUnitPrice(); }

    async function saveCompra() {
      const sku = getCompraSkuValue();
      if (!sku) { showToast('warning', 'Campo obrigatório', 'Selecione ou informe um SKU.'); return; }

      const qty = parseInt(document.getElementById('compra-qty').value) || 0;
      if (qty <= 0) { showToast('warning', 'Quantidade inválida', 'A quantidade deve ser maior que zero.'); return; }

      const total = parseMoneyInputValue(document.getElementById('compra-total').value) || 0;
      if (total < 0) { showToast('warning', 'Valor inválido', 'O valor total não pode ser negativo.'); return; }

      const preco = qty > 0 ? total / qty : 0;
      document.getElementById('compra-preco').value = preco > 0 ? formatMoneyInputValue(preco) : '';

      const venda = parseMoneyInputValue(document.getElementById('compra-venda').value) || 0;
      const cartaoId = document.getElementById('compra-cartao').value;
      const contaId = document.getElementById('compra-conta').value;
      const parcelas = parseInt(document.getElementById('compra-parcelas').value) || 1;

      const compras = loadCompras();
      const cartoes = loadCartoes();

      if (editCompraId) {
        const cIndex = compras.findIndex(c => c.id === editCompraId);
        if (cIndex !== -1) {
          const oldCompra = compras[cIndex];
          if (oldCompra.cartaoId) {
            const oldCardIdx = cartoes.findIndex(c => c.id === oldCompra.cartaoId);
            if (oldCardIdx !== -1) cartoes[oldCardIdx].utilizado = Math.max(0, (cartoes[oldCardIdx].utilizado || 0) - oldCompra.total);
          }
          if (cartaoId) {
            const newCardIdx = cartoes.findIndex(c => c.id === cartaoId);
            if (newCardIdx !== -1) cartoes[newCardIdx].utilizado = (cartoes[newCardIdx].utilizado || 0) + total;
          }
          compras[cIndex] = {
            ...oldCompra,
            sku,
            compraNome: document.getElementById('compra-nome').value.trim(),
            compraLink: document.getElementById('compra-link').value.trim(),
            catNome: document.getElementById('cat-nome').value.trim(),
            catLink: document.getElementById('cat-link').value.trim(),
            qty,
            preco,
            total,
            cartaoId,
            contaId,
            parcelas,
            venda,
            margem: document.getElementById('compra-margem').value.trim(),
            roi: document.getElementById('compra-roi').value.trim()
          };
        }
      } else {
        if (cartaoId) {
          const newCardIdx = cartoes.findIndex(c => c.id === cartaoId);
          if (newCardIdx !== -1) cartoes[newCardIdx].utilizado = (cartoes[newCardIdx].utilizado || 0) + total;
        }
        compras.unshift({
          id: makeId(),
          sku,
          compraNome: document.getElementById('compra-nome').value.trim(),
          compraLink: document.getElementById('compra-link').value.trim(),
          catNome: document.getElementById('cat-nome').value.trim(),
          catLink: document.getElementById('cat-link').value.trim(),
          qty,
          preco,
          total,
          cartaoId,
          contaId,
          parcelas,
          venda,
          margem: document.getElementById('compra-margem').value.trim(),
          roi: document.getElementById('compra-roi').value.trim(),
          date: new Date().toISOString()
        });
      }

      setButtonLoading('btn-save-compra', true);
      try {
        await saveCartoes(cartoes);
        await saveCompras(compras);
        closeModal('compra');
        showToast('success', 'Compra salva', 'O preço unitário foi calculado pelo valor total ÷ quantidade.');
        renderCompras(); renderCartoes(); renderContas(); renderFinanceiro(); renderDashboard();
      } catch (err) { handleAsyncError(err, 'Erro ao salvar compra.'); }
      finally { setButtonLoading('btn-save-compra', false); }
    }

    function deleteCompra(id) {
      openConfirmacao({
        titulo: 'Excluir compra',
        subtitulo: 'Confirme para remover este registro.',
        mensagem: 'Deseja realmente excluir este registro de compra? Esta ação não poderá ser desfeita.',
        textoNao: 'Não, cancelar',
        textoSim: 'Sim, excluir',
        onConfirm: async () => {
          const compras = loadCompras();
          const compra = compras.find(c => c.id === id);
          if (compra && compra.cartaoId) {
            const cartoes = loadCartoes();
            const cIndex = cartoes.findIndex(c => c.id === compra.cartaoId);
            if (cIndex !== -1) {
              cartoes[cIndex].utilizado = Math.max(0, (cartoes[cIndex].utilizado || 0) - compra.total);
              await saveCartoes(cartoes);
            }
          }
          await saveCompras(compras.filter(c => c.id !== id));
          showToast('success', 'Compra excluída', 'O registro foi removido.');
          renderCartoes(); renderContas(); renderCompras(); renderFinanceiro();
        }
      });
    }

    // Função para expandir e recolher o log de compras de um SKU específico
    function toggleSkuGroup(sku) {
      const safeSku = sku.replace(/[^a-zA-Z0-9_-]/g, '');
      const groupEl = document.getElementById('group-' + safeSku);
      const iconEl = document.getElementById('icon-' + safeSku);

      if (!groupEl || !iconEl) return;

      if (groupEl.style.display === 'none') {
        groupEl.style.display = 'block';
        iconEl.style.transform = 'rotate(90deg)'; // Gira a seta para baixo
      } else {
        groupEl.style.display = 'none';
        iconEl.style.transform = 'rotate(0deg)';  // Volta a seta para a direita
      }
    }

    function renderCompras() {
      let compras = loadCompras();
      const cartoes = loadCartoes();
      const contas = loadContas();
      const body = document.getElementById('compras-table-body');

      // Helper interno para converter strings de porcentagem ("25,5%") ou números em floats válidos
      function parsePercent(val) {
        if (typeof val === 'number') return val;
        if (!val || val === '—') return null;
        const cleaned = String(val).replace('%', '').replace(',', '.').trim();
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
      }

      // 1. Filtro de busca original
      const q = (document.getElementById('compras-search')?.value || '').toLowerCase().trim();
      if (q) compras = compras.filter(c => {
        const card = cartoes.find(k => k.id === c.cartaoId);
        const conta = contas.find(k => k.id === c.contaId);
        const haystack = `${c.sku} ${c.compraNome} ${c.catNome} ${card ? card.nome : ''} ${conta ? conta.plataforma + ' ' + conta.usuario : ''}`.toLowerCase();
        return haystack.includes(q);
      });

      if (compras.length === 0) {
        body.innerHTML = `<div class="empty-state"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.3; display:block; color: var(--text-muted);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg><p>${q ? 'Nenhuma compra encontrada para "' + q + '".' : 'Nenhum registro de compra encontrado.'}</p></div>`;
        return;
      }

      // 2. Agrupamento por SKU
      const agrupadas = {};
      compras.forEach(c => {
        const skuKey = c.sku || 'Sem SKU';
        if (!agrupadas[skuKey]) agrupadas[skuKey] = [];
        agrupadas[skuKey].push(c);
      });

      // 3. Geração do HTML estruturado
      body.innerHTML = Object.keys(agrupadas).map(sku => {
        const itens = agrupadas[sku];
        const safeSku = sku.replace(/[^a-zA-Z0-9_-]/g, '');

        // --- CÁLCULOS DA LINHA PAI ---

        // Catálogo: Puxa o primeiro registro que possuir um nome de catálogo válido
        const itemComCatalogo = itens.find(c => c.catNome && c.catNome !== '—');
        let catHTML = '—';
        if (itemComCatalogo) {
          catHTML = itemComCatalogo.catLink
            ? `<a href="${itemComCatalogo.catLink}" target="_blank" class="link-styled">${itemComCatalogo.catNome}</a>`
            : itemComCatalogo.catNome;
        }

        // Qtd: Somada tudo
        const totalQty = itens.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);

        // Preço Unitário: Média aritmética simples dos preços unitários lançados
        const totalPreco = itens.reduce((acc, curr) => acc + (Number(curr.preco) || 0), 0);
        const avgPreco = itens.length > 0 ? totalPreco / itens.length : 0;

        // Valor Total: Soma tudo
        const totalValor = itens.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

        // P. Venda: Puxa o primeiro preço de venda preenchido encontrado nos logs
        const itemComVenda = itens.find(c => c.venda && c.venda !== 0 && c.venda !== '—');
        const vendaPai = itemComVenda ? Number(itemComVenda.venda) : 0;

        // Margem: Média das margens existentes
        const margensValidas = itens.map(c => parsePercent(c.margem)).filter(v => v !== null);
        const avgMargem = margensValidas.length > 0 ? margensValidas.reduce((a, b) => a + b, 0) / margensValidas.length : null;
        const margemFmt = avgMargem !== null ? avgMargem.toFixed(2).replace('.', ',') + '%' : '—';

        // ROI: Média dos ROIs existentes (se existirem)
        const roisValidos = itens.map(c => parsePercent(c.roi)).filter(v => v !== null);
        const avgRoi = roisValidos.length > 0 ? roisValidos.reduce((a, b) => a + b, 0) / roisValidos.length : null;
        const roiFmt = avgRoi !== null ? avgRoi.toFixed(2).replace('.', ',') + '%' : '—';

        // --- RENDERIZAÇÃO DA LINHA PAI (RESUMO) ---
        let parentHTML = `
    <div class="table-row-compras" style="background: rgba(156,163,175,0.06); cursor: pointer; border-left: 3px solid var(--accent);" onclick="toggleSkuGroup('${safeSku}')">
      <div style="font-weight:700; display:flex; align-items:center; gap:8px;">
        <svg id="icon-${safeSku}" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="transition: transform 0.2s; flex-shrink: 0;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
        <span>${sku}</span>
      </div>
      <div style="color:var(--text-dim); font-style: italic;">—</div>
      <div>${catHTML}</div>
      <div style="font-weight:700">${totalQty}</div>
      <div class="cell-muted">${fmt(avgPreco)}</div>
      <div style="font-weight:800;color:var(--green)">${fmt(totalValor)}</div>
      <div style="color:var(--text-dim)">—</div>
      <div style="color:var(--text-dim)">—</div>
      <div class="cell-muted">${vendaPai > 0 ? fmt(vendaPai) : '—'}</div>
      <div class="cell-muted" style="font-weight:600">${margemFmt}</div>
      <div class="cell-muted" style="font-weight:600">${roiFmt}</div>
      <div></div>
    </div>`;

        // --- RENDERIZAÇÃO DOS LOGS FILHOS (INDIVIDUAIS) ---
        let childrenHTML = `<div id="group-${safeSku}" style="display:none; background: var(--recessed-bg);">`;

        childrenHTML += itens.map(c => {
          const dataCompraFmt = c.date ? new Date(c.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';
          let compraHTML = `<div style="font-size:13px;font-weight:500">${c.compraNome || '—'}</div>${dataCompraFmt ? `<div style="font-size:11px;color:var(--text-dim);margin-top:2px">${dataCompraFmt}</div>` : ''}`;
          if (c.compraLink) compraHTML = `<div><a href="${c.compraLink}" target="_blank" class="link-styled">${c.compraNome || 'Acessar Link'}</a></div>${dataCompraFmt ? `<div style="font-size:11px;color:var(--text-dim);margin-top:2px">${dataCompraFmt}</div>` : ''}`;

          let individualCatHTML = c.catNome || '—';
          if (c.catLink) individualCatHTML = `<a href="${c.catLink}" target="_blank" class="link-styled">${c.catNome || 'Acessar Link'}</a>`;

          let pagamentoHTML = `<div style="font-size:11px;line-height:1.3"><strong>Caixa</strong></div>`;
          if (c.cartaoId) {
            const card = cartoes.find(card => card.id === c.cartaoId);
            if (card) {
              pagamentoHTML = `<div style="font-size:11px;line-height:1.3"><strong>${card.nome}</strong><br><span style="color:var(--text-dim)">${c.parcelas > 1 ? c.parcelas + 'x' : 'À vista'}</span></div>`;
            } else {
              pagamentoHTML = `<span style="font-size:11px;color:var(--text-dim)">Cartão excluido</span>`;
            }
          }

          let contaHTML = `<span style="font-size:11px;color:var(--text-dim)">—</span>`;
          if (c.contaId) {
            const conta = contas.find(k => k.id === c.contaId);
            if (conta) {
              contaHTML = `<div style="font-size:11px;line-height:1.3"><strong>${escapeHtml(conta.plataforma)}</strong><br><span style="color:var(--text-dim)">${escapeHtml(conta.usuario)}</span></div>`;
            } else {
              contaHTML = `<span style="font-size:11px;color:var(--text-dim)">Conta excluída</span>`;
            }
          }

          return `
      <div class="table-row-compras" style="border-bottom: 1px solid var(--divider-soft);">
        <div style="padding-left: 22px; display: flex; align-items: center;">
          <button class="btn btn-ghost" style="font-size:10px; padding:2px 6px; color:var(--text-dim);" onclick="duplicateCompra('${c.id}')" title="Duplicar Registro">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:12px;height:12px;margin-right:4px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            Duplicar
          </button>
        </div>
        <div>${compraHTML}</div>
        <div>${individualCatHTML}</div>
        <div style="font-weight:600">${c.qty}</div>
        <div class="cell-muted">${fmt(c.preco)}</div>
        <div style="font-weight:700;color:var(--green)">${fmt(c.total)}</div>
        <div>${pagamentoHTML}</div>
        <div>${contaHTML}</div>
        <div class="cell-muted">${fmt(c.venda)}</div>
        <div class="cell-muted">${c.margem || '—'}</div>
        <div class="cell-muted">${c.roi || '—'}</div>
        <div style="display:flex;gap:4px;align-items:center;">
          <button class="icon-btn" style="color:var(--blue);border-color:transparent" onclick="openEditCompraModal('${c.id}')" title="Editar">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </button>
          <button class="icon-btn" style="color:var(--danger);border-color:transparent" onclick="deleteCompra('${c.id}')" title="Excluir">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>`;
        }).join('');

        childrenHTML += `</div>`;

        return parentHTML + childrenHTML;
      }).join('');
    }

    // ─── CARTÕES E GERENCIADOR DE FATURAS ────────────────────────────────────────
    function openCartaoModal() { editCartaoId = null; document.getElementById('modal-cartao-title').textContent = 'Adicionar Cartão'; document.getElementById('btn-save-cartao').textContent = 'Salvar Cartão';['cartao-nome', 'cartao-digitos', 'cartao-limite'].forEach(id => { document.getElementById(id).value = ''; }); openModal('cartao'); }
    function openEditCartaoModal(id) { const cartao = loadCartoes().find(c => String(c.id) === String(id)); if (!cartao) return; editCartaoId = id; document.getElementById('modal-cartao-title').textContent = 'Editar Cartão'; document.getElementById('btn-save-cartao').textContent = 'Salvar Alterações'; document.getElementById('cartao-nome').value = cartao.nome; document.getElementById('cartao-digitos').value = cartao.digitos; document.getElementById('cartao-limite').value = formatMoneyInputValue(cartao.limite); openModal('cartao'); }

    async function saveCartao() {
      const nome = document.getElementById('cartao-nome').value.trim();
      const digitos = document.getElementById('cartao-digitos').value.trim();
      if (!nome || !digitos || digitos.length !== 4) { showToast('warning', 'Dados inválidos', 'Informe o apelido e os 4 últimos dígitos do cartão.'); return; }
      const limite = parseMoneyInputValue(document.getElementById('cartao-limite').value);
      const cartoes = loadCartoes();

      if (editCartaoId) {
        const idx = cartoes.findIndex(c => String(c.id) === String(editCartaoId));
        if (idx !== -1) { cartoes[idx].nome = nome; cartoes[idx].digitos = digitos; cartoes[idx].limite = limite; }
      } else {
        cartoes.push({ id: makeId(), nome, digitos, limite, utilizado: 0, createdAt: new Date().toISOString() });
      }

      setButtonLoading('btn-save-cartao', true);
      try {
        await saveCartoes(cartoes);
        closeModal('cartao');
        showToast('success', 'Cartão salvo', 'O cartão foi atualizado no financeiro.');
        syncCompraPaymentSelect(document.getElementById('compra-cartao') ? document.getElementById('compra-cartao').value : '');
        renderCartoes(); renderFinanceiro(); renderCompras();
      } catch (err) { handleAsyncError(err, 'Erro ao salvar cartão.'); }
      finally { setButtonLoading('btn-save-cartao', false); }
    }

    function deleteCartao(id) {
      openConfirmacao({
        titulo: 'Excluir cartão',
        subtitulo: 'Confirme para remover este cartão.',
        mensagem: 'Deseja realmente excluir este cartão? As compras e lançamentos vinculados ficarão sem cartão vinculado.',
        textoNao: 'Não, cancelar',
        textoSim: 'Sim, excluir',
        onConfirm: async () => {
          await saveCartoes(loadCartoes().filter(c => String(c.id) !== String(id)));
          await loadAllData();
          syncCompraPaymentSelect(document.getElementById('compra-cartao') ? document.getElementById('compra-cartao').value : '');
          showToast('success', 'Cartão excluído', 'O cartão foi removido.');
          renderCartoes(); renderFinanceiro(); renderCompras();
        }
      });
    }

    // Motor das Faturas
    function getCartaoFaturas(cartaoId) {
      const compras = loadCompras().filter(c => c.cartaoId === cartaoId);
      const pagamentos = loadFinanceiro().filter(l => l.tipo === 'fatura' && l.cartaoId === cartaoId);
      let totalPago = pagamentos.reduce((a, b) => a + b.valor, 0);

      const meses = {};
      compras.forEach(c => {
        const dataCompra = new Date(c.date);
        const valParcela = c.total / c.parcelas;
        for (let i = 1; i <= c.parcelas; i++) {
          let d = new Date(dataCompra.getFullYear(), dataCompra.getMonth() + i, 1);
          let key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!meses[key]) meses[key] = { total: 0, items: [] };
          meses[key].total += valParcela;
          meses[key].items.push({ nome: c.compraNome || c.sku, val: valParcela, num: i, de: c.parcelas });
        }
      });

      const chavesOrdenadas = Object.keys(meses).sort();
      const faturas = [];
      let saldoPagoResidual = totalPago;

      chavesOrdenadas.forEach(key => {
        let totalMes = meses[key].total;
        let pagoMes = 0;
        if (saldoPagoResidual >= totalMes) { pagoMes = totalMes; saldoPagoResidual -= totalMes; }
        else if (saldoPagoResidual > 0) { pagoMes = saldoPagoResidual; saldoPagoResidual = 0; }

        faturas.push({
          mes: key, total: totalMes, pago: pagoMes, pendente: totalMes - pagoMes,
          status: pagoMes >= totalMes ? 'pago' : (pagoMes > 0 ? 'parcial' : 'pendente')
        });
      });
      return faturas;
    }

    function openFaturasModal(cartaoId) {
      const cartao = loadCartoes().find(c => c.id === cartaoId);
      if (!cartao) return;
      document.getElementById('faturas-cartao-nome').textContent = `Faturas: ${cartao.nome}`;
      const faturas = getCartaoFaturas(cartaoId);
      const container = document.getElementById('faturas-list');

      if (faturas.length === 0) {
        container.innerHTML = `<div class="empty-state" style="padding: 20px;"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.3; display:block; color: var(--text-muted);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg><p>Nenhuma compra parcelada ou fatura prevista.</p></div>`;
      } else {
        container.innerHTML = faturas.map(f => {
          const isPago = f.status === 'pago';
          const bg = isPago ? 'rgba(199,199,199,0.08)' : 'var(--surface2)';
          const statusHtml = isPago ? `<span class="fatura-status pago">Pago</span>` : (f.status === 'parcial' ? `<span class="fatura-status parcial">Restam ${fmt(f.pendente)}</span>` : `<span class="fatura-status pendente">Pendente</span>`);

          let btnHtml = '';
          if (!isPago) {
            btnHtml = `<button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px;" onclick="payFaturaFromList('${cartao.id}', ${f.pendente}, 'Fatura ${formatMesAno(f.mes)} - ${cartao.nome}')">Pagar</button>`;
          }

          return `
      <div class="fatura-card" style="background: ${bg}">
        <div class="fatura-info">
          <h4>${formatMesAno(f.mes)}</h4>
          <p>Total: <strong>${fmt(f.total)}</strong></p>
        </div>
        <div style="display:flex; align-items:center; gap: 14px;">
          ${statusHtml}
          ${btnHtml}
        </div>
      </div>`;
        }).join('');
      }
      openModal('faturas');
    }

    function payFaturaFromList(cartaoId, valorPendente, desc) {
      closeModal('faturas');
      openFinanceiroModal();
      selectFinType('fatura');
      const card = loadCartoes().find(c => c.id === cartaoId);
      rebuildCustomSelect('cs-fin-cartao', loadCartoes().map(c => ({ value: c.id, label: `${c.nome} (Final ${c.digitos})` })), cartaoId);
      document.getElementById('fin-cartao').value = cartaoId;
      document.getElementById('fin-valor').value = formatMoneyInputValue(valorPendente);
      document.getElementById('fin-descricao').value = desc || (card ? `Fatura - ${card.nome}` : 'Pagamento de fatura');
    }

    function renderCartoes() {
      const cartoes = loadCartoes();
      const grid = document.getElementById('cartoes-grid');
      if (!grid) return;

      if (cartoes.length === 0) { grid.innerHTML = `<div class="empty-state" style="padding:30px 20px;grid-column:1/-1"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.3; display:block; color: var(--text-muted);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg><p>Nenhum cartão cadastrado.</p></div>`; return; }

      grid.innerHTML = cartoes.map(c => {
        const limite = c.limite || 0; const utilizado = c.utilizado || 0;
        const disponivel = Math.max(0, limite - utilizado);
        const pct = limite > 0 ? Math.min(100, (utilizado / limite) * 100) : 0;
        const barColor = pct >= 90 ? 'var(--danger)' : pct >= 60 ? 'var(--yellow)' : 'var(--green)';

        // Encontrar próxima fatura
        const faturas = getCartaoFaturas(c.id);
        const fPendente = faturas.find(f => f.pendente > 0);
        const proxFaturaHtml = fPendente ? `<span style="color:var(--text);font-weight:700">${fmt(fPendente.pendente)} <span style="font-size:10px;color:var(--text-muted);font-weight:500">(${formatMesAno(fPendente.mes)})</span></span>` : `<span style="color:var(--text-dim)">Nenhuma</span>`;

        return `
    <div class="credit-card">
      <div class="credit-card-header">
        <div>
          <div class="credit-card-name">${c.nome}</div>
          <div class="credit-card-digits">•••• •••• •••• ${c.digitos}</div>
        </div>
        <div class="credit-card-actions">
          <button class="credit-card-edit" onclick="openEditCartaoModal('${c.id}')" title="Editar cartão"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
          <button class="credit-card-delete" onclick="deleteCartao('${c.id}')" title="Remover cartão"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
        </div>
      </div>

      <div class="credit-card-values">
        <div><div class="credit-card-val-label">Limite Total</div><div class="credit-card-val">${fmt(limite)}</div></div>
        <div><div class="credit-card-val-label">Utilizado</div><div class="credit-card-val utilizado">${fmt(utilizado)}</div></div>
        <div><div class="credit-card-val-label">Disponível</div><div class="credit-card-val disponivel">${fmt(disponivel)}</div></div>
        <div><div class="credit-card-val-label">Uso</div><div class="credit-card-val" style="color:${barColor}">${pct.toFixed(1)}%</div></div>
      </div>
      <div class="usage-bar-wrap"><div class="usage-bar-track"><div class="usage-bar-fill" style="width:${pct}%;background:${barColor}"></div></div></div>
      
      <div style="margin-top: 14px; border-top: 1px solid var(--border); padding-top: 12px; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 11px; color: var(--text-muted)">Próx. Vencimento: <br>${proxFaturaHtml}</div>
        <button class="btn btn-ghost" style="padding: 5px 10px; font-size: 11px;" onclick="openFaturasModal('${c.id}')">Ver Faturas</button>
      </div>
    </div>`;
      }).join('');
    }

    // ─── CONTAS DE COMPRA (Amazon, Mercado Livre, etc) ────────────────────────────
    function openContaModal() {
      editContaId = null;
      document.getElementById('modal-conta-title').textContent = 'Adicionar Conta';
      document.getElementById('btn-save-conta').textContent = 'Salvar Conta';
      ['conta-plataforma', 'conta-usuario'].forEach(id => { document.getElementById(id).value = ''; });
      openModal('conta');
    }
    function openEditContaModal(id) {
      const conta = loadContas().find(c => String(c.id) === String(id));
      if (!conta) return;
      editContaId = id;
      document.getElementById('modal-conta-title').textContent = 'Editar Conta';
      document.getElementById('btn-save-conta').textContent = 'Salvar Alterações';
      document.getElementById('conta-plataforma').value = conta.plataforma;
      document.getElementById('conta-usuario').value = conta.usuario;
      openModal('conta');
    }

    async function saveConta() {
      const plataforma = document.getElementById('conta-plataforma').value.trim();
      const usuario = document.getElementById('conta-usuario').value.trim();
      if (!plataforma || !usuario) { showToast('warning', 'Dados inválidos', 'Informe a plataforma e o usuário da conta.'); return; }
      const contas = loadContas();

      if (editContaId) {
        const idx = contas.findIndex(c => String(c.id) === String(editContaId));
        if (idx !== -1) { contas[idx].plataforma = plataforma; contas[idx].usuario = usuario; }
      } else {
        contas.push({ id: makeId(), plataforma, usuario, createdAt: new Date().toISOString() });
      }

      setButtonLoading('btn-save-conta', true);
      try {
        await saveContas(contas);
        closeModal('conta');
        showToast('success', 'Conta salva', 'A conta de compra foi atualizada.');
        syncCompraContaSelect(document.getElementById('compra-conta') ? document.getElementById('compra-conta').value : '');
        renderContas(); renderCompras();
      } catch (err) { handleAsyncError(err, 'Erro ao salvar conta.'); }
      finally { setButtonLoading('btn-save-conta', false); }
    }

    function deleteConta(id) {
      openConfirmacao({
        titulo: 'Excluir conta',
        subtitulo: 'Confirme para remover esta conta.',
        mensagem: 'Deseja realmente excluir esta conta de compra? As compras vinculadas ficarão sem conta indicada.',
        textoNao: 'Não, cancelar',
        textoSim: 'Sim, excluir',
        onConfirm: async () => {
          await saveContas(loadContas().filter(c => String(c.id) !== String(id)));
          await loadAllData();
          syncCompraContaSelect(document.getElementById('compra-conta') ? document.getElementById('compra-conta').value : '');
          showToast('success', 'Conta excluída', 'A conta foi removida.');
          renderContas(); renderCompras();
        }
      });
    }

    function renderContas() {
      let contas = loadContas();
      const grid = document.getElementById('contas-grid');
      if (!grid) return;

      const q = (document.getElementById('contas-search')?.value || '').toLowerCase().trim();
      if (q) contas = contas.filter(c => `${c.plataforma} ${c.usuario}`.toLowerCase().includes(q));

      if (contas.length === 0) { grid.innerHTML = `<div class="empty-state" style="padding:30px 20px;grid-column:1/-1"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.3; display:block; color: var(--text-muted);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg><p>${q ? 'Nenhuma conta encontrada para "' + q + '".' : 'Nenhuma conta cadastrada.'}</p></div>`; return; }

      grid.innerHTML = contas.map(c => {
        const comprasVinculadas = loadCompras().filter(compra => compra.contaId === c.id);
        const totalCompras = comprasVinculadas.length;
        const totalValor = comprasVinculadas.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
        return `
    <div class="credit-card">
      <div class="credit-card-header">
        <div>
          <div class="credit-card-name">${escapeHtml(c.plataforma)}</div>
          <div class="credit-card-digits" style="font-family:inherit;letter-spacing:normal">${escapeHtml(c.usuario)}</div>
        </div>
        <div class="credit-card-actions">
          <button class="credit-card-edit" onclick="openEditContaModal('${c.id}')" title="Editar conta"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
          <button class="credit-card-delete" onclick="deleteConta('${c.id}')" title="Remover conta"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
        </div>
      </div>

      <div class="credit-card-values">
        <div><div class="credit-card-val-label">Compras</div><div class="credit-card-val">${totalCompras}</div></div>
        <div><div class="credit-card-val-label">Total Gasto</div><div class="credit-card-val" style="color:var(--green)">${fmt(totalValor)}</div></div>
      </div>

      <div style="margin-top: 14px; border-top: 1px solid var(--border); padding-top: 12px; display: flex; justify-content: flex-end; align-items: center;">
        <button class="btn btn-ghost" style="padding: 5px 10px; font-size: 11px;" onclick="openContaComprasModal('${c.id}')">Ver Compras</button>
      </div>
    </div>`;
      }).join('');
    }

    function openContaComprasModal(contaId) {
      const conta = loadContas().find(c => c.id === contaId);
      if (!conta) return;
      document.getElementById('conta-compras-nome').textContent = `Compras: ${conta.plataforma} — ${conta.usuario}`;
      const compras = loadCompras().filter(c => c.contaId === contaId).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      const list = document.getElementById('conta-compras-list');

      if (compras.length === 0) {
        list.innerHTML = `<div class="empty-state" style="padding:24px 10px"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.3; display:block; color: var(--text-muted);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg><p>Nenhuma compra vinculada a esta conta ainda.</p></div>`;
      } else {
        list.innerHTML = compras.map(c => {
          const dataFmt = c.date ? new Date(c.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
          const nomeHTML = c.compraLink
            ? `<a href="${c.compraLink}" target="_blank" class="link-styled">${escapeHtml(c.compraNome || 'Acessar Link')}</a>`
            : escapeHtml(c.compraNome || '—');
          return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid var(--border);border-radius:10px;background:var(--surface2)">
        <div style="min-width:0">
          <div style="font-size:13px;font-weight:700">${escapeHtml(c.sku || 'Sem SKU')}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${nomeHTML}</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:2px">${dataFmt} · Qtd: ${c.qty || 0}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:14px;font-weight:800;color:var(--green)">${fmt(c.total)}</div>
          <button class="icon-btn" style="margin-top:6px;color:var(--blue);border-color:transparent" onclick="closeModal('conta-compras'); openEditCompraModal('${c.id}')" title="Editar compra">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </button>
        </div>
      </div>`;
        }).join('');
      }
      openModal('conta-compras');
    }

    // ─── FINANCEIRO E CAIXA ───────────────────────────────────────────────────────
    function selectFinType(type) {
      finType = type;
      document.getElementById('fin-type-receita').classList.toggle('selected', type === 'receita');
      document.getElementById('fin-type-despesa').classList.toggle('selected', type === 'despesa');
      document.getElementById('fin-type-fatura').classList.toggle('selected', type === 'fatura');

      const pagWrap = document.getElementById('fin-pagamento-wrap');
      const pagLabel = document.getElementById('fin-pagamento-label');
      const cartaoSelect = document.getElementById('fin-cartao');
      const csDropdown = document.getElementById('cs-fin-cartao-dropdown');

      if (type === 'receita') {
        pagWrap.style.display = 'none'; cartaoSelect.value = '';
      } else if (type === 'despesa') {
        pagWrap.style.display = ''; pagLabel.textContent = 'Forma de Pagamento';
        // re-enable all custom options
        if (csDropdown) csDropdown.querySelectorAll('.custom-select-option').forEach(o => o.style.display = '');
        // pick Caixa/Dinheiro by default
        const firstOpt = csDropdown && csDropdown.querySelector('.custom-select-option');
        if (firstOpt) pickCustomSelect('cs-fin-cartao', '', 'Caixa / Dinheiro', firstOpt);
      } else if (type === 'fatura') {
        pagWrap.style.display = ''; pagLabel.textContent = 'Qual cartão está pagando?';
        // hide "Caixa / Dinheiro" option in custom dropdown
        if (csDropdown) {
          const cashOpt = csDropdown.querySelector('[data-value=""]');
          if (cashOpt) cashOpt.style.display = 'none';
          const firstCard = csDropdown.querySelector('.custom-select-option:not([data-value=""])');
          if (firstCard) { pickCustomSelect('cs-fin-cartao', firstCard.dataset.value, firstCard.textContent.trim(), firstCard); }
        }
      }
    }

    function openFinanceiroModal() {
      const opts = [{ value: '', label: 'Caixa / Dinheiro' }].concat(loadCartoes().map(c => ({ value: c.id, label: `${c.nome} (Final ${c.digitos})` })));
      rebuildCustomSelect('cs-fin-cartao', opts, '');

      finType = 'receita'; selectFinType('receita');
      ['fin-descricao', 'fin-valor', 'fin-categoria'].forEach(id => { document.getElementById(id).value = ''; });
      document.getElementById('fin-data').value = new Date().toISOString().slice(0, 10);
      openModal('financeiro');
    }

    async function saveFinanceiro() {
      const descricao = document.getElementById('fin-descricao').value.trim();
      if (!descricao) { showToast('warning', 'Campo obrigatório', 'Descrição é obrigatória.'); return; }
      const valor = parseMoneyInputValue(document.getElementById('fin-valor').value);
      const cartaoId = document.getElementById('fin-cartao').value;
      if (finType === 'fatura' && !cartaoId) { showToast('warning', 'Cartão não selecionado', 'Selecione o cartão para o qual você está pagando a fatura.'); return; }

      const cartoes = loadCartoes();
      if (cartaoId) {
        const cIndex = cartoes.findIndex(c => c.id === cartaoId);
        if (cIndex !== -1) {
          if (finType === 'despesa') cartoes[cIndex].utilizado = (cartoes[cIndex].utilizado || 0) + valor;
          else if (finType === 'fatura') cartoes[cIndex].utilizado = Math.max(0, (cartoes[cIndex].utilizado || 0) - valor);
        }
      }

      const lancamentos = loadFinanceiro();
      lancamentos.unshift({
        id: makeId(), descricao, tipo: finType, valor, data: document.getElementById('fin-data').value,
        categoria: document.getElementById('fin-categoria').value.trim(), cartaoId: (finType === 'receita') ? '' : cartaoId,
        createdAt: new Date().toISOString()
      });

      try {
        await saveCartoes(cartoes);
        await saveFinanceiro2(lancamentos);
        closeModal('financeiro'); showToast('success', 'Lançamento salvo', 'O fluxo de caixa foi atualizado.'); renderFinanceiro(); renderCartoes();
      } catch (err) { handleAsyncError(err, 'Erro ao salvar lançamento financeiro.'); }
    }

    function deleteFinanceiro(id) {
      openConfirmacao({
        titulo: 'Excluir lançamento',
        subtitulo: 'Confirme para remover este lançamento financeiro.',
        mensagem: 'Deseja realmente excluir este lançamento? Esta ação ajustará os valores vinculados ao cartão, quando houver.',
        textoNao: 'Não, cancelar',
        textoSim: 'Sim, excluir',
        onConfirm: async () => {
          const lancamentos = loadFinanceiro();
          const l = lancamentos.find(x => x.id === id);
          if (l && l.cartaoId) {
            const cartoes = loadCartoes();
            const cIndex = cartoes.findIndex(c => c.id === l.cartaoId);
            if (cIndex !== -1) {
              if (l.tipo === 'despesa') cartoes[cIndex].utilizado = Math.max(0, (cartoes[cIndex].utilizado || 0) - l.valor);
              else if (l.tipo === 'fatura') cartoes[cIndex].utilizado = (cartoes[cIndex].utilizado || 0) + l.valor;
              await saveCartoes(cartoes);
            }
          }
          await saveFinanceiro2(lancamentos.filter(x => x.id !== id));
          showToast('success', 'Lançamento excluído', 'O registro financeiro foi removido.');
          renderFinanceiro(); renderCartoes();
        }
      });
    }

    function renderFinanceiro() {
      const lancamentos = loadFinanceiro(); const compras = loadCompras(); const cartoes = loadCartoes();
      const receitas = lancamentos.filter(l => l.tipo === 'receita').reduce((a, l) => a + (l.valor || 0), 0);

      // Fluxo de caixa: considera somente dinheiro/caixa imediato.
      // Compras e despesas vinculadas a cartão NÃO reduzem o caixa na hora.
      // Pagamento de fatura reduz caixa, pois representa saída de dinheiro para quitar o cartão.
      const despesasLancamentosCaixa = lancamentos
        .filter(l => l.tipo === 'despesa' && !l.cartaoId)
        .reduce((a, l) => a + (l.valor || 0), 0);
      const comprasCaixa = compras
        .filter(c => !c.cartaoId)
        .reduce((a, c) => a + (c.total || 0), 0);
      const faturasPagas = lancamentos
        .filter(l => l.tipo === 'fatura')
        .reduce((a, l) => a + (l.valor || 0), 0);

      const despesasGlobais = despesasLancamentosCaixa + comprasCaixa + faturasPagas;
      const saldoCaixa = receitas - despesasGlobais;

      document.getElementById('fin-receitas').textContent = fmt(receitas);
      document.getElementById('fin-despesas').textContent = fmt(despesasGlobais);
      const caixaEl = document.getElementById('fin-caixa'); caixaEl.textContent = fmt(saldoCaixa); caixaEl.style.color = saldoCaixa >= 0 ? 'var(--green)' : 'var(--danger)';

      const totalComprasEl = document.getElementById('fin-total-compras'); if (totalComprasEl) totalComprasEl.textContent = compras.length;
      const totalComprasSubEl = document.getElementById('fin-total-compras-sub');
      if (totalComprasSubEl) {
        const comprasCartao = compras.filter(c => c.cartaoId).reduce((a, c) => a + (c.total || 0), 0);
        totalComprasSubEl.textContent = `${fmt(comprasCaixa)} no caixa · ${fmt(comprasCartao)} no cartão`;
      }

      const body = document.getElementById('financeiro-table-body');
      if (lancamentos.length === 0) { body.innerHTML = `<div class="empty-state"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.3; display:block; color: var(--text-muted);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg><p>Nenhum lançamento registrado.</p></div>`; return; }

      
      // -- INÍCIO GRÁFICO FINANCEIRO --
      const ctxFin = document.getElementById('financeiroChart');
      if (ctxFin) {
        if (window.financeiroChartInstance) window.financeiroChartInstance.destroy();
        const labels = []; const balData = []; let runBal = 0;
        const days = [];
        for (let i = 14; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          days.push(d.toISOString().slice(0, 10));
          labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
        }
        const pastDate = days[0];
        lancamentos.forEach(l => {
          if (l.data && l.data < pastDate) {
            if (l.tipo === 'receita') runBal += l.valor;
            if (l.tipo === 'despesa' && !l.cartaoId) runBal -= l.valor;
            if (l.tipo === 'fatura') runBal -= l.valor;
          }
        });
        compras.forEach(c => {
          if (c.date && c.date.slice(0, 10) < pastDate && !c.cartaoId) runBal -= c.total;
        });
        for (let day of days) {
          lancamentos.forEach(l => {
            if (l.data && l.data.startsWith(day)) {
              if (l.tipo === 'receita') runBal += l.valor;
              if (l.tipo === 'despesa' && !l.cartaoId) runBal -= l.valor;
              if (l.tipo === 'fatura') runBal -= l.valor;
            }
          });
          compras.forEach(c => {
            if (c.date && c.date.startsWith(day) && !c.cartaoId) runBal -= c.total;
          });
          balData.push(runBal);
        }
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const textColor = isLight ? '#64748b' : '#94a3b8';
        const gridColor = isLight ? '#e2e8f0' : '#334155';
        window.financeiroChartInstance = new Chart(ctxFin, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Saldo de Caixa', data: balData,
              borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.15)',
              fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#3b82f6'
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: textColor, font: { family: 'Inter' } } } },
            scales: {
              y: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Inter' } } },
              x: { grid: { display: false }, ticks: { color: textColor, font: { family: 'Inter' } } }
            }
          }
        });
      }
      // -- FIM GRÁFICO FINANCEIRO --

      body.innerHTML = lancamentos.map(l => {
        let tipoTag = ''; let cor = ''; let sinal = '';
        if (l.tipo === 'receita') { tipoTag = '💰 Receita'; cor = 'var(--green)'; sinal = '+'; }
        else if (l.tipo === 'despesa') { tipoTag = '💸 Despesa'; cor = 'var(--danger)'; sinal = '-'; }
        else if (l.tipo === 'fatura') { tipoTag = '💳 Fatura'; cor = 'var(--blue)'; sinal = '-'; }

        const dataFmt = l.data ? new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
        let pagInfo = 'Caixa (Dinheiro)';
        if (l.cartaoId) { const card = cartoes.find(c => c.id === l.cartaoId); pagInfo = card ? `💳 ${card.nome}` : 'Cartão excluído'; }
        if (l.tipo === 'receita') pagInfo = '—';

        return `
    <div class="table-row-financeiro">
      <div style="font-weight:500">${escapeHtml(l.descricao)}</div>
      <div class="cell-muted">${dataFmt}</div>
      <div><span class="tag" style="background:rgba(150,150,150,0.1);color:${cor}">${tipoTag}</span></div>
      <div class="cell-muted">${escapeHtml(l.categoria || '—')}</div>
      <div style="font-weight:700;color:${cor}">${sinal} ${fmt(l.valor)}</div>
      <div class="cell-muted" style="font-size:12px">${escapeHtml(pagInfo)}</div>
      <div>
        <button class="icon-btn" style="color:var(--danger);border-color:transparent" onclick="deleteFinanceiro('${l.id}')" title="Excluir">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>
    </div>`;
      }).join('');
    }
    // ── CUSTOM SELECT ENGINE ──

    // ─── LOGS DO SISTEMA ────────────────────────────────────────────────────────
    async function refreshLogs(options = {}) {
      const silent = Boolean(options.silent);
      try {
        assertSupabase();
        const logs = await fetchTable('system_logs', 'created_at', false, TABLE_COLUMNS.system_logs);
        appData.logs = logs.map(mapLogFromDb);
        renderLogsFromCache();
      } catch (err) {
        console.warn(err);
        if (!silent) handleAsyncError(err, 'Não foi possível carregar os logs do sistema. Verifique se a tabela system_logs foi criada.');
        renderLogsFromCache();
      }
    }

    function renderLogsFromCache() {
      const logs = loadLogs();
      const totalEl = document.getElementById('logs-total');
      if (!totalEl) return;

      const inserts = logs.filter(l => l.acao === 'INSERT').length;
      const updates = logs.filter(l => l.acao === 'UPDATE').length;
      const deletes = logs.filter(l => l.acao === 'DELETE').length;

      document.getElementById('logs-total').textContent = logs.length;
      document.getElementById('logs-inserts').textContent = inserts;
      document.getElementById('logs-updates').textContent = updates;
      document.getElementById('logs-deletes').textContent = deletes;

      const tableFilter = document.getElementById('log-table-filter');
      if (tableFilter) {
        const current = tableFilter.value || 'todos';
        const tables = [...new Set(logs.map(l => l.tabela).filter(Boolean))].sort();
        tableFilter.innerHTML = `<option value="todos">Todas as tabelas</option>` + tables.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
        tableFilter.value = tables.includes(current) ? current : 'todos';
      }

      const q = (document.getElementById('log-search')?.value || '').toLowerCase().trim();
      const action = document.getElementById('log-action-filter')?.value || 'todos';
      const table = document.getElementById('log-table-filter')?.value || 'todos';
      const filtered = logs.filter(l => {
        const matchesAction = action === 'todos' || l.acao === action;
        const matchesTable = table === 'todos' || l.tabela === table;
        const haystack = `${l.descricao || ''} ${l.tabela || ''} ${l.acao || ''} ${l.registroId || ''}`.toLowerCase();
        return matchesAction && matchesTable && (!q || haystack.includes(q));
      });

      const body = document.getElementById('logs-table-body');
      if (!body) return;

      if (!filtered.length) {
        body.innerHTML = `<div class="empty-state"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.3; display:block; color: var(--text-muted);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg><p>Nenhum log encontrado para os filtros atuais.</p></div>`;
        return;
      }

      body.innerHTML = filtered.slice(0, 300).map(l => {
        const actionClass = l.acao === 'INSERT' ? 'insert' : l.acao === 'UPDATE' ? 'update' : l.acao === 'DELETE' ? 'delete' : '';
        const actionLabel = l.acao === 'INSERT' ? 'Cadastro' : l.acao === 'UPDATE' ? 'Edição' : l.acao === 'DELETE' ? 'Exclusão' : l.acao;
        return `
      <div class="table-row-logs" title="${escapeHtml(l.registroId || '')}">
        <div class="cell-muted">${fmtDate(l.createdAt)}</div>
        <div><span class="log-action ${actionClass}">${escapeHtml(actionLabel)}</span></div>
        <div class="cell-muted">${escapeHtml(l.tabela)}</div>
        <div>${escapeHtml(l.descricao || 'Ação registrada')}</div>
        <div class="cell-muted">${escapeHtml((l.registroId || '—').slice(0, 18))}${l.registroId && l.registroId.length > 18 ? '…' : ''}</div>
      </div>`;
      }).join('');
    }

    function toggleCustomSelect(id) {
      const wrap = document.getElementById(id);
      const isOpen = wrap.classList.contains('open');
      document.querySelectorAll('.custom-select-wrap.open').forEach(el => el.classList.remove('open'));
      if (!isOpen) wrap.classList.add('open');
    }
    function pickCustomSelect(id, value, label, optEl) {
      const wrap = document.getElementById(id);
      document.getElementById(id + '-label').textContent = label;
      wrap.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
      optEl.classList.add('selected');
      const realId = id.slice(3); // 'cs-foo' -> 'foo'
      const real = document.getElementById(realId);
      if (real) { real.value = value; real.dispatchEvent(new Event('change')); }
      wrap.classList.remove('open');
      // Hook especial para SKU de compra
      if (id === 'cs-compra-sku') pickCompraSkuOption(value);
    }
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.custom-select-wrap')) {
        document.querySelectorAll('.custom-select-wrap.open').forEach(el => el.classList.remove('open'));
      }
    });
    // Rebuild a custom dropdown from options array [{value, label}] and set selectedValue
    function escapeHtml(value) {
      return String(value || '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    }

    function rebuildCustomSelect(csId, options, selectedValue) {
      const dropdown = document.getElementById(csId + '-dropdown');
      const labelEl = document.getElementById(csId + '-label');
      if (!dropdown) return;

      const normalizedSelected = selectedValue === null || selectedValue === undefined ? '' : String(selectedValue);
      const safeOptions = (options || []).map(opt => ({
        value: opt.value === null || opt.value === undefined ? '' : String(opt.value),
        label: opt.label === null || opt.label === undefined ? '' : String(opt.label)
      }));

      dropdown.innerHTML = safeOptions.map(opt => {
        const sel = opt.value === normalizedSelected;
        const valueArg = JSON.stringify(opt.value).replace(/'/g, '&#39;');
        const labelArg = JSON.stringify(opt.label).replace(/'/g, '&#39;');
        return `<div class="custom-select-option${sel ? ' selected' : ''}" data-value="${escapeHtml(opt.value)}" onclick='pickCustomSelect("${csId}",${valueArg},${labelArg},this)'><span class="opt-check"></span>${escapeHtml(opt.label)}</div>`;
      }).join('');

      const active = safeOptions.find(o => o.value === normalizedSelected) || safeOptions[0];
      if (labelEl && active) labelEl.textContent = active.label;

      const realId = csId.slice(3);
      const real = document.getElementById(realId);
      if (real) {
        real.innerHTML = safeOptions.map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('');
        real.value = active ? active.value : '';
      }
    }

    // ── LOADING STATE ──────────────────────────────────────────────────────────
    function setButtonLoading(btnId, loading, originalText) {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      if (loading) {
        btn.dataset.originalText = btn.textContent;
        btn.disabled = true;
        btn.style.opacity = '0.7';
        btn.textContent = 'Salvando…';
      } else {
        btn.disabled = false;
        btn.style.opacity = '';
        btn.textContent = originalText || btn.dataset.originalText || btn.textContent;
      }
    }

    // ── TOAST ──────────────────────────────────────────────────────────────────
    function showToast(type, title, detail = '') {
      const root = document.getElementById('toast-root');
      if (!root) return;
      const icons = { success: '✓', error: '✕', warning: '!' };
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.innerHTML = `
    <div class="toast-icon">${icons[type] || '•'}</div>
    <div><strong>${title}</strong>${detail ? `<p>${detail}</p>` : ''}</div>`;
      root.appendChild(toast);
      setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3500);
    }

    function rerenderActivePage() {
      const activePage = document.querySelector('[id^="page-"].active');
      const pageId = activePage ? activePage.id : 'page-dashboard';

      if (pageId === 'page-dashboard') renderDashboard();
      else if (pageId === 'page-estoque') { renderKpis(); renderTable(); }
      else if (pageId === 'page-anunciados') renderAnunciados();
      else if (pageId === 'page-movimentacoes') renderMovimentacoes();
      else if (pageId === 'page-produto-detalhe') renderProductDetail();
      else if (pageId === 'page-compras') switchSubpage(currentSubpage || 'compras');
      else if (pageId === 'page-contas') renderContas();
      else if (pageId === 'page-logs') renderLogsFromCache();
    }

    // ── TEMA CLARO/ESCURO ──────────────────────────────────────────────────────
    function applyThemeIcon() {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const moon = document.getElementById('theme-icon-moon');
      const sun = document.getElementById('theme-icon-sun');
      if (moon) moon.style.display = isLight ? 'none' : '';
      if (sun) sun.style.display = isLight ? '' : 'none';
    }
    function toggleTheme() {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      if (isLight) {
        document.documentElement.removeAttribute('data-theme');
        try { localStorage.setItem('theme', 'dark'); } catch (e) { }
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        try { localStorage.setItem('theme', 'light'); } catch (e) { }
      }
      applyThemeIcon();
      if(window.renderDashboard) renderDashboard();
      if(window.renderFinanceiro) renderFinanceiro();
    }

    async function initApp() {
      applyThemeIcon();
      const dashDate = document.getElementById('dash-date');
      if (dashDate) {
        dashDate.textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      }

      // Mostra a interface imediatamente com a página do dashboard, para a
      // tela não ficar em branco enquanto aguarda Supabase/CDN/rede responder.
      // A página correta (se diferente) é restaurada logo depois, já com os
      // dados carregados — assim uma atualização (F5) não te joga de volta
      // para o Início.
      document.querySelectorAll('[id^="page-"]').forEach(p => p.classList.remove('active'));
      document.getElementById('page-dashboard').classList.add('active');

      try {
        await setupSupabaseClient();
        await loadAllData();
      } catch (err) {
        handleAsyncError(err, 'Não foi possível iniciar o sistema.');
      }

      restaurarUltimaPagina();
    }

    window.addEventListener('error', function (event) {
      console.error('Erro global:', event.error || event.message);
      const dash = document.getElementById('page-dashboard');
      if (dash && !document.querySelector('[id^="page-"].active')) dash.classList.add('active');
    });

    initApp();