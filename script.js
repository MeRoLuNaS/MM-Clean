let dados = {
    servicos: JSON.parse(localStorage.getItem('mm_servicos')) || [
        { id: 999999, nome: 'Entrada em caixa', preco: 0.00, coleta: false }
    ],
    agenda: JSON.parse(localStorage.getItem('mm_agenda')) || [],
    gastos: JSON.parse(localStorage.getItem('mm_gastos')) || [],
    entradas: JSON.parse(localStorage.getItem('mm_entradas')) || [],
    pendencias: JSON.parse(localStorage.getItem('mm_pendencias')) || []
};

let itensAgendamentoTemporarios = [];
let agendamentoIdFinalizando = null;
let pendenciaIdResolvendo = null;
let mesSelecionadoGrafico = null; // formato 'YYYY-MM'

function salvarDados() {
    localStorage.setItem('mm_servicos', JSON.stringify(dados.servicos));
    localStorage.setItem('mm_agenda', JSON.stringify(dados.agenda));
    localStorage.setItem('mm_gastos', JSON.stringify(dados.gastos));
    localStorage.setItem('mm_entradas', JSON.stringify(dados.entradas));
    localStorage.setItem('mm_pendencias', JSON.stringify(dados.pendencias));
    atualizarTudo();
}

function toggleMenu() {
    const nav = document.getElementById('menu-nav');
    nav.classList.toggle('show');
}

function mudarAba(abaId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${abaId}`).classList.add('active');
    event.currentTarget.classList.add('active');
    toggleMenu();
}

function toggleDashboardDetalhes() {
    const detalhes = document.getElementById('dash-detalhes-container');
    detalhes.style.display = detalhes.style.display === 'none' ? 'block' : 'none';
}

function toggleSecao(elementId, btn) {
    const el = document.getElementById(elementId);
    if (el.style.display === 'none') {
        el.style.display = 'block';
        btn.innerText = 'Esconder';
    } else {
        el.style.display = 'none';
        btn.innerText = 'Mostrar';
    }
}

// --- SERVIÇOS ---
function garantirServicoEntradaCaixa() {
    let existe = dados.servicos.some(s => s.nome.toLowerCase() === 'entrada em caixa');
    if (!existe) {
        dados.servicos.unshift({ id: 999999, nome: 'Entrada em caixa', preco: 0.00, coleta: false });
    }
}

function salvarServico(e) {
    e.preventDefault();
    const id = document.getElementById('serv-id').value;
    const nome = document.getElementById('serv-nome').value;
    const preco = parseFloat(document.getElementById('serv-preco').value);
    const coleta = document.getElementById('serv-coleta').checked;

    if (id) {
        const s = dados.servicos.find(item => item.id == id);
        if (s && s.nome.toLowerCase() === 'entrada em caixa') {
            alert('O serviço "Entrada em caixa" é protegido e não pode ser editado.');
            return;
        }
        s.nome = nome;
        s.preco = preco;
        s.coleta = coleta;
    } else {
        dados.servicos.push({ id: Date.now(), nome, preco, coleta });
    }

    document.getElementById('form-servico').reset();
    document.getElementById('serv-id').value = '';
    salvarDados();
}

function editarServico(id) {
    const s = dados.servicos.find(item => item.id == id);
    if (s && s.nome.toLowerCase() === 'entrada em caixa') {
        alert('O serviço "Entrada em caixa" é protegido e não pode ser editado.');
        return;
    }
    document.getElementById('serv-id').value = s.id;
    document.getElementById('serv-nome').value = s.nome;
    document.getElementById('serv-preco').value = s.preco;
    document.getElementById('serv-coleta').checked = s.coleta;
}

function excluirServico(id) {
    const s = dados.servicos.find(item => item.id == id);
    if (s && s.nome.toLowerCase() === 'entrada em caixa') {
        alert('O serviço "Entrada em caixa" é protegido e não pode ser excluído.');
        return;
    }
    dados.servicos = dados.servicos.filter(item => item.id != id);
    salvarDados();
}

function renderizarServicos() {
    garantirServicoEntradaCaixa();
    const container = document.getElementById('lista-servicos');
    container.innerHTML = '';

    dados.servicos.forEach(s => {
        let isProtegido = s.nome.toLowerCase() === 'entrada em caixa';
        container.innerHTML += `
            <div class="item-card">
                <strong>${s.nome}</strong>
                <span>Preço Sugerido: R$ ${s.preco.toFixed(2)}</span>
                <span>Exige Coleta: ${s.coleta ? 'Sim' : 'Não'}</span>
                <div class="acoes">
                    ${!isProtegido ? `<button class="btn-acao btn-editar" onclick="editarServico(${s.id})">Editar</button>` : '<span style="font-size:0.8rem; color:#64748b; font-weight:bold;">Serviço Padrão (Protegido)</span>'}
                    ${!isProtegido ? `<button class="btn-acao btn-excluir" onclick="excluirServico(${s.id})">Excluir</button>` : ''}
                </div>
            </div>
        `;
    });
    filtrarServicosPorTipo();
}

function filtrarServicosPorTipo() {
    const tipoVisita = document.getElementById('ag-tipo').value;
    const selectAdd = document.getElementById('select-add-servico');
    selectAdd.innerHTML = '<option value="">Selecione um serviço</option>';

    dados.servicos.forEach(s => {
        if (tipoVisita === 'Coleta de Tapete' && !s.coleta) return;
        if (tipoVisita === 'Execução no Local' && s.coleta) return;

        selectAdd.innerHTML += `<option value="${s.id}" data-nome="${s.nome}" data-preco="${s.preco}" data-coleta="${s.coleta}">${s.nome} (R$ ${s.preco.toFixed(2)})</option>`;
    });
}

// --- AGENDA & SERVIÇOS INDIVIDUAIS ---
function verificarSelecaoServicoEspecial(select) {
    const opt = select.options[select.selectedIndex];
    if (!opt || !opt.value) return;
    const nomeServico = opt.getAttribute('data-nome') || '';

    const inputTel = document.getElementById('ag-telefone');
    const inputEnd = document.getElementById('ag-endereco');
    const boxAddServico = document.getElementById('box-add-servico-container');

    if (nomeServico.toLowerCase() === 'entrada em caixa') {
        inputTel.value = '00000000000';
        inputTel.disabled = true;
        inputEnd.value = 'Caixa';
        inputEnd.disabled = true;
        boxAddServico.style.opacity = '0.5';
        boxAddServico.style.pointerEvents = 'none';
        
        if (itensAgendamentoTemporarios.length === 0) {
            itensAgendamentoTemporarios = [{
                servicoId: select.value,
                nome: nomeServico,
                precoUnitario: parseFloat(opt.getAttribute('data-preco')) || 0,
                qtd: 1,
                totalItem: 0,
                exigeColeta: false
            }];
            atualizararCamposEspeciaisEntradaCaixa();
        }
    } else {
        inputTel.disabled = false;
        inputEnd.disabled = false;
        boxAddServico.style.opacity = '1';
        boxAddServico.style.pointerEvents = 'auto';
    }
}

function atualizararCamposEspeciaisEntradaCaixa() {
    const container = document.getElementById('lista-itens-agendamento');
    container.innerHTML = '';
    itensAgendamentoTemporarios.forEach((item, index) => {
        container.innerHTML += `
            <div style="display:flex; flex-direction:column; gap:4px; background:#fff; padding:8px 10px; border-radius:4px; border:1px solid #cbd5e1; font-size:0.85rem;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span><strong>${item.nome}</strong></span>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                    <span>Valor de Entrada (R$):</span>
                    <input type="number" step="0.01" value="${item.totalItem.toFixed(2)}" oninput="atualizarValorItemTemp(${index}, this.value)" style="padding:4px; font-size:0.9rem;">
                </div>
            </div>
        `;
    });
    atualizarValorTotalAgendamento();
}

function adicionarItemServicoAgendamento() {
    const select = document.getElementById('select-add-servico');
    const opt = select.options[select.selectedIndex];
    if (!select.value) return;

    const servicoId = select.value;
    const nome = opt.getAttribute('data-nome');
    const precoUnitario = parseFloat(opt.getAttribute('data-preco'));
    const exigeColeta = opt.getAttribute('data-coleta') === 'true';
    const qtd = parseInt(document.getElementById('add-qtd').value) || 1;

    if (nome.toLowerCase() === 'entrada em caixa') {
        itensAgendamentoTemporarios = [{
            servicoId,
            nome,
            precoUnitario,
            qtd: 1,
            totalItem: 0,
            exigeColeta: false
        }];
        atualizararCamposEspeciaisEntradaCaixa();
        return;
    }

    itensAgendamentoTemporarios.push({
        servicoId,
        nome,
        precoUnitario,
        qtd,
        totalItem: precoUnitario * qtd,
        exigeColeta
    });

    document.getElementById('add-qtd').value = 1;
    select.value = '';
    atualizarListaItensTemporarios();
}

function atualizarValorItemTemp(index, novoValorTotal) {
    itensAgendamentoTemporarios[index].totalItem = parseFloat(novoValorTotal) || 0;
    atualizarValorTotalAgendamento();
}

function removerItemTemp(index) {
    itensAgendamentoTemporarios.splice(index, 1);
    document.getElementById('ag-telefone').disabled = false;
    document.getElementById('ag-endereco').disabled = false;
    const boxAddServico = document.getElementById('box-add-servico-container');
    boxAddServico.style.opacity = '1';
    boxAddServico.style.pointerEvents = 'auto';
    atualizarListaItensTemporarios();
}

function atualizarValorTotalAgendamento() {
    let somaTotal = 0;
    itensAgendamentoTemporarios.forEach(item => {
        somaTotal += item.totalItem;
    });
    document.getElementById('lbl-valor-total').innerText = `R$ ${somaTotal.toFixed(2)}`;
}

function atualizarListaItensTemporarios() {
    const container = document.getElementById('lista-itens-agendamento');
    container.innerHTML = '';

    itensAgendamentoTemporarios.forEach((item, index) => {
        container.innerHTML += `
            <div style="display:flex; flex-direction:column; gap:4px; background:#fff; padding:8px 10px; border-radius:4px; border:1px solid #cbd5e1; font-size:0.85rem;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span><strong>${item.nome}</strong> (Qtd: ${item.qtd})</span>
                    <button type="button" class="btn-acao btn-excluir" onclick="removerItemTemp(${index})">X</button>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                    <span>Valor (R$):</span>
                    <input type="number" step="0.01" value="${item.totalItem.toFixed(2)}" oninput="atualizarValorItemTemp(${index}, this.value)" style="padding:4px; font-size:0.9rem;">
                </div>
            </div>
        `;
    });

    atualizarValorTotalAgendamento();
}

function copiarEnderecoTexto(endereco) {
    navigator.clipboard.writeText(endereco);
    alert('Endereço copiado para a área de transferência!');
}

function salvarAgendamento(e) {
    e.preventDefault();
    if (itensAgendamentoTemporarios.length === 0) {
        alert('Adicione pelo menos um serviço ao agendamento.');
        return;
    }

    const cliente = document.getElementById('ag-cliente').value;
    const telefone = document.getElementById('ag-telefone').value;
    const bairro = document.getElementById('ag-bairro').value;
    const tipo = document.getElementById('ag-tipo').value;
    const datahora = document.getElementById('ag-datahora').value;
    const endereco = document.getElementById('ag-endereco').value;
    
    let valorTotalCalculado = 0;
    itensAgendamentoTemporarios.forEach(i => valorTotalCalculado += i.totalItem);

    const isEntradaCaixa = itensAgendamentoTemporarios.some(i => i.nome.toLowerCase() === 'entrada em caixa');

    if (isEntradaCaixa) {
        const agoraIso = new Date().toISOString();
        if (valorTotalCalculado > 0) {
            registrarEntrada(`${cliente}`, valorTotalCalculado, agoraIso, bairro || 'Caixa');
        }
        document.getElementById('form-agenda').reset();
        itensAgendamentoTemporarios = [];
        document.getElementById('lista-itens-agendamento').innerHTML = '';
        document.getElementById('lbl-valor-total').innerText = 'R$ 0,00';
        document.getElementById('ag-telefone').disabled = false;
        document.getElementById('ag-endereco').disabled = false;
        const boxAddServico = document.getElementById('box-add-servico-container');
        boxAddServico.style.opacity = '1';
        boxAddServico.style.pointerEvents = 'auto';
        alert('Entrada em caixa registrada com sucesso!');
        salvarDados();
        return;
    }

    const id = document.getElementById('ag-id').value || Date.now();
    const possuiColeta = itensAgendamentoTemporarios.some(i => i.exigeColeta) || tipo.includes('Coleta');

    const agendamentoObj = {
        id,
        cliente,
        telefone,
        bairro,
        tipo,
        datahora,
        endereco,
        itens: [...itensAgendamentoTemporarios],
        valorTotal: valorTotalCalculado,
        possuiColeta,
        status: 'Agendado'
    };

    if (document.getElementById('ag-id').value) {
        dados.agenda = dados.agenda.map(a => a.id == id ? agendamentoObj : a);
    } else {
        dados.agenda.push(agendamentoObj);
    }

    document.getElementById('form-agenda').reset();
    document.getElementById('ag-id').value = '';
    itensAgendamentoTemporarios = [];
    document.getElementById('lista-itens-agendamento').innerHTML = '';
    document.getElementById('lbl-valor-total').innerText = 'R$ 0,00';
    document.getElementById('ag-telefone').disabled = false;
    document.getElementById('ag-endereco').disabled = false;
    const boxAddServico = document.getElementById('box-add-servico-container');
    boxAddServico.style.opacity = '1';
    boxAddServico.style.pointerEvents = 'auto';
    
    salvarDados();
}

function editarAgendamento(id) {
    const a = dados.agenda.find(item => item.id == id);
    if (!a) return;

    document.getElementById('ag-id').value = a.id;
    document.getElementById('ag-cliente').value = a.cliente;
    document.getElementById('ag-telefone').value = a.telefone;
    document.getElementById('ag-bairro').value = a.bairro || '';
    document.getElementById('ag-tipo').value = a.tipo;
    document.getElementById('ag-datahora').value = a.datahora;
    document.getElementById('ag-endereco').value = a.endereco;

    itensAgendamentoTemporarios = [...a.itens];
    atualizarListaItensTemporarios();
    mudarAbaTabDireto('agenda');
}

function excluirAgendamento(id) {
    dados.agenda = dados.agenda.filter(item => item.id != id);
    salvarDados();
}

function alternarAcordeao(event) {
    const card = event.currentTarget.closest('.item-card');
    card.classList.toggle('expandido');
}

function imprimirOrcamento(id) {
    const a = dados.agenda.find(item => item.id == id);
    if (!a) return;

    let linhasItens = '';
    a.itens.forEach(i => {
        linhasItens += `
            <tr>
                <td style="border: 1px solid #cbd5e1; padding: 10px;">${i.nome}</td>
                <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: center;">${i.qtd}</td>
                <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: right;">R$ ${(i.totalItem / i.qtd).toFixed(2)}</td>
                <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: right;">R$ ${i.totalItem.toFixed(2)}</td>
            </tr>
        `;
    });

    let dObj = new Date(a.datahora);
    let dataHoraFmt = `${String(dObj.getDate()).padStart(2,'0')}/${String(dObj.getMonth()+1).padStart(2,'0')}/${dObj.getFullYear()} às ${String(dObj.getHours()).padStart(2,'0')}:${String(dObj.getMinutes()).padStart(2,'0')}`;

    // Logo em formato Base64 otimizado para carregar de forma 100% garantida na nova guia
    const logoBase64 = "logo.jpg";
    let html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Orçamento - ${a.cliente}</title>
            <style>
                body { font-family: sans-serif; padding: 30px; color: #1e293b; max-width: 800px; margin: 0 auto; }
                .topo { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px; }
                .logo-container img { max-height: 85px; width: auto; }
                .empresa-info { text-align: right; }
                .empresa-info h2 { margin: 0; color: #1d4ed8; font-size: 1.3rem; }
                .empresa-info p { margin: 4px 0; font-size: 0.9rem; color: #64748b; }
                .dados-cliente { background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #cbd5e1; margin-bottom: 20px; }
                .dados-cliente p { margin: 6px 0; font-size: 0.95rem; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { background: #2563eb; color: white; border: 1px solid #2563eb; padding: 10px; text-align: left; }
                .total-box { text-align: right; font-size: 1.2rem; font-weight: bold; background: #f1f5f9; padding: 15px; border-radius: 6px; }
                @media print {
                    .nao-imprimir { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="topo">
                <div class="logo-container">
                    <img src="${logoBase64}" alt="M&M Clean Logo" onerror="this.style.display='none'">
                </div>
                <div class="empresa-info">
                    <h2>M&M Clean - Curitiba</h2>
                    <p>Contato / WhatsApp: (41) 92007-2736</p>
                    <p>Serviços de Limpeza e Higienização</p>
                </div>
            </div>

            <h2 style="color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px;">ORÇAMENTO DE SERVIÇOS</h2>

            <div class="dados-cliente">
                <p><strong>Cliente:</strong> ${a.cliente}</p>
                <p><strong>Telefone / WhatsApp:</strong> ${a.telefone}</p>
                <p><strong>Endereço / Bairro:</strong> ${a.endereco} (${a.bairro || 'Não informado'})</p>
                <p><strong>Data/Hora Prevista:</strong> ${dataHoraFmt}</p>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Serviço</th>
                        <th style="text-align: center;">Qtd</th>
                        <th style="text-align: right;">Valor Unitário</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasItens}
                </tbody>
            </table>

            <div class="total-box">
                Valor Total do Orçamento: R$ ${a.valorTotal.toFixed(2)}
            </div>

            <div style="margin-top: 40px; text-align: center;" class="nao-imprimir">
                <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 12px 24px; font-size: 1rem; border-radius: 6px; cursor: pointer; font-weight: bold;">Imprimir / Salvar PDF</button>
            </div>
        </body>
        </html>
    `;

    let novaAba = window.open();
    novaAba.document.write(html);
}

function renderizarAgenda() {
    const container = document.getElementById('lista-agenda');
    const inputFiltroData = document.getElementById('filtro-agenda-data');
    
    if (!inputFiltroData.value) {
        let hojeStr = new Date().toISOString().split('T')[0];
        inputFiltroData.value = hojeStr;
    }

    let dataSelecionada = inputFiltroData.value;
    container.innerHTML = '';
    
    const pendentes = dados.agenda.filter(a => {
        if (a.status !== 'Agendado') return false;
        let dataAgendamentoStr = a.datahora ? a.datahora.split('T')[0] : '';
        return dataAgendamentoStr === dataSelecionada;
    });

    if (pendentes.length === 0) {
        container.innerHTML = `<p>Não há nenhum agendamento ativo para a data selecionada.</p>`;
        return;
    }

    pendentes.forEach(a => {
        let itensHtml = a.itens.map(i => `<li>${i.nome} (Qtd: ${i.qtd}) - R$ ${i.totalItem.toFixed(2)}</li>`).join('');
        const linkWpp = `https://wa.me/55${a.telefone.replace(/\D/g, '')}`;
        const isOrcamento = a.tipo === 'Visita / Orçamento';
        
        let dObj = new Date(a.datahora);
        let dataHoraFmt = `${String(dObj.getDate()).padStart(2,'0')}/${String(dObj.getMonth()+1).padStart(2,'0')} ${String(dObj.getHours()).padStart(2,'0')}:${String(dObj.getMinutes()).padStart(2,'0')}`;

        container.innerHTML += `
            <div class="item-card">
                <div class="item-header" onclick="alternarAcordeao(event)">
                    <span>${a.cliente} — ${dataHoraFmt} [${a.tipo}]</span>
                    <i class="fa-solid fa-chevron-down"></i>
                </div>
                <div class="item-detalhes">
                    <span><strong>Telefone:</strong> ${a.telefone}</span>
                    <span><strong>Bairro:</strong> ${a.bairro || 'Não informado'}</span>
                    <span><strong>Endereço:</strong> ${a.endereco} <button class="btn-acao btn-pdf" style="padding:2px 6px;" onclick="copiarEnderecoTexto('${a.endereco}')">Copiar</button></span>
                    <span><strong>Serviços:</strong><ul>${itensHtml}</ul></span>
                    <span><strong>Valor Total:</strong> R$ ${a.valorTotal.toFixed(2)}</span>
                    <div class="acoes">
                        <a href="${linkWpp}" target="_blank" class="btn-acao btn-whatsapp" style="text-decoration:none;"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>
                        <button class="btn-acao btn-editar" onclick="editarAgendamento(${a.id})">Editar</button>
                        <button class="btn-acao btn-excluir" onclick="excluirAgendamento(${a.id})">Excluir</button>
                        ${isOrcamento ? `<button class="btn-acao btn-pdf" onclick="imprimirOrcamento(${a.id})"><i class="fa-solid fa-print"></i> Imprimir</button>` : ''}
                        ${!isOrcamento ? `<button class="btn-acao btn-concluir" onclick="abrirModalFinalizar(${a.id})">Finalizar</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
}

// --- MODAL DE FINALIZAÇÃO ---
function abrirModalFinalizar(id) {
    agendamentoIdFinalizando = id;
    const a = dados.agenda.find(item => item.id == id);
    
    document.getElementById('modal-info-cliente').innerText = `Cliente: ${a.cliente}`;
    document.getElementById('modal-info-total').innerText = `Valor Total: R$ ${a.valorTotal.toFixed(2)}`;
    document.getElementById('pag-valor-pago').value = a.valorTotal.toFixed(2);

    const boxColeta = document.getElementById('container-coleta-check');
    const chkColeta = document.getElementById('check-coleta-realizada');
    chkColeta.checked = false;

    if (a.possuiColeta) {
        boxColeta.style.display = 'block';
    } else {
        boxColeta.style.display = 'none';
    }

    document.getElementById('modal-finalizar').style.display = 'flex';
}

function fecharModalFinalizar() {
    document.getElementById('modal-finalizar').style.display = 'none';
    agendamentoIdFinalizando = null;
}

function registrarEntrada(desc, valor, dataHoraIso, bairro = '') {
    if (!dados.entradas) dados.entradas = [];
    dados.entradas.push({
        id: Date.now() + Math.random(),
        desc,
        valor,
        dataHora: dataHoraIso,
        bairro
    });
}

function executarFinalizacao() {
    const a = dados.agenda.find(item => item.id == agendamentoIdFinalizando);
    const valorPago = parseFloat(document.getElementById('pag-valor-pago').value) || 0;
    const chkColeta = document.getElementById('check-coleta-realizada');

    if (a.possuiColeta && !chkColeta.checked) {
        alert('Este serviço possui coleta. É necessário marcar a caixinha de coleta realizada para finalizar.');
        return;
    }

    let valorFaltante = 0;
    if (valorPago < a.valorTotal) {
        valorFaltante = a.valorTotal - valorPago;
        if (!a.possuiColeta) {
            dados.pendencias.push({
                id: Date.now(),
                cliente: a.cliente,
                telefone: a.telefone,
                descricao: `Falta de pagamento parcial (${a.cliente})`,
                valorFaltante: valorFaltante,
                tipo: 'Falta de Pagamento'
            });
            alert(`Valor faltante de R$ ${valorFaltante.toFixed(2)}. Enviado para Pendências.`);
        } else {
            alert(`Valor parcial recebido. Saldo devedor de R$ ${valorFaltante.toFixed(2)} irá para o Controle de Entregas.`);
        }
    } else {
        alert('Serviço finalizado com sucesso!');
    }

    const agoraIso = new Date().toISOString();

    if (valorPago > 0) {
        registrarEntrada(`${a.cliente}`, valorPago, agoraIso, a.bairro || 'Geral');
    }

    if (a.possuiColeta) {
        let dataEntrega = new Date();
        dataEntrega.setDate(dataEntrega.getDate() + 7);
        
        a.status = 'Em Entrega';
        a.prazoEntrega = dataEntrega.toISOString();
        a.valorFaltanteEntrega = valorFaltante;
    } else {
        a.status = 'Concluido';
    }

    fecharModalFinalizar();
    salvarDados();
}

// --- ENTREGAS ---
function renderizarEntregas() {
    const container = document.getElementById('lista-entregas');
    container.innerHTML = '';

    const entregasPendentes = dados.agenda.filter(a => a.status === 'Em Entrega');
    if (entregasPendentes.length === 0) {
        container.innerHTML = `<p>Nenhuma entrega pendente.</p>`;
        return;
    }

    entregasPendentes.forEach(a => {
        const prazoF = new Date(a.prazoEntrega).toLocaleDateString('pt-BR');
        const valorExibir = (a.valorFaltanteEntrega !== undefined && a.valorFaltanteEntrega > 0) ? a.valorFaltanteEntrega : 0;
        const linkWpp = `https://wa.me/55${a.telefone.replace(/\D/g, '')}`;

        container.innerHTML += `
            <div class="item-card">
                <div class="item-header" onclick="alternarAcordeao(event)">
                    <span>${a.cliente} - Prazo: ${prazoF}</span>
                    <i class="fa-solid fa-chevron-down"></i>
                </div>
                <div class="item-detalhes">
                    <span><strong>Telefone:</strong> ${a.telefone}</span>
                    <span><strong>Endereço:</strong> ${a.endereco} <button class="btn-acao btn-pdf" style="padding:2px 6px;" onclick="copiarEnderecoTexto('${a.endereco}')">Copiar</button></span>
                    <span><strong>Valor a receber na Entrega (Saldo Devedor):</strong> R$ ${valorExibir.toFixed(2)}</span>
                    <div class="acoes">
                        <a href="${linkWpp}" target="_blank" class="btn-acao btn-whatsapp" style="text-decoration:none;"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>
                        <button class="btn-acao btn-concluir" onclick="abrirModalFinalizarEntrega(${a.id}, ${valorExibir})">Finalizar Entrega</button>
                    </div>
                </div>
            </div>
        `;
    });
}

function abrirModalFinalizarEntrega(id, valorExibir) {
    agendamentoIdFinalizando = id;
    const a = dados.agenda.find(item => item.id == id);
    
    document.getElementById('modal-info-cliente').innerText = `Entrega Cliente: ${a.cliente}`;
    document.getElementById('modal-info-total').innerText = `Valor a Pagar: R$ ${valorExibir.toFixed(2)}`;
    document.getElementById('pag-valor-pago').value = valorExibir.toFixed(2);
    document.getElementById('container-coleta-check').style.display = 'none';

    document.getElementById('modal-finalizar').style.display = 'flex';
    window.acaoFinalizarAtual = 'entrega';
}

window.executarFinalizacao = function() {
    const a = dados.agenda.find(item => item.id == agendamentoIdFinalizando);
    const valorPago = parseFloat(document.getElementById('pag-valor-pago').value) || 0;
    
    if (window.acaoFinalizarAtual === 'entrega') {
        window.acaoFinalizarAtual = '';
        const valorEsperado = (a.valorFaltanteEntrega !== undefined && a.valorFaltanteEntrega > 0) ? a.valorFaltanteEntrega : 0;

        if (valorPago < valorEsperado) {
            const faltante = valorEsperado - valorPago;
            dados.pendencias.push({
                id: Date.now(),
                cliente: a.cliente,
                telefone: a.telefone,
                descricao: `Falta de pgto entrega (${a.cliente})`,
                valorFaltante: faltante,
                tipo: 'Falta de Pagamento'
            });
            alert(`Valor faltante de R$ ${faltante.toFixed(2)}. Enviado para Pendências.`);
        } else {
            alert('Entrega finalizada com sucesso!');
        }

        const agoraIso = new Date().toISOString();

        if (valorPago > 0) {
            registrarEntrada(`${a.cliente}`, valorPago, agoraIso, a.bairro || 'Geral');
        }

        a.status = 'Concluido';
        fecharModalFinalizar();
        salvarDados();
        return;
    }

    const chkColeta = document.getElementById('check-coleta-realizada');
    if (a.possuiColeta && !chkColeta.checked) {
        alert('Este serviço possui coleta. É necessário marcar a caixinha de coleta realizada.');
        return;
    }

    let valorFaltante = 0;
    if (valorPago < a.valorTotal) {
        valorFaltante = a.valorTotal - valorPago;
        if (!a.possuiColeta) {
            dados.pendencias.push({
                id: Date.now(),
                cliente: a.cliente,
                telefone: a.telefone,
                descricao: `Falta de pagamento parcial (${a.cliente})`,
                valorFaltante: valorFaltante,
                tipo: 'Falta de Pagamento'
            });
            alert(`Valor faltante de R$ ${valorFaltante.toFixed(2)}. Enviado para Pendências.`);
        } else {
            alert(`Valor parcial recebido. Saldo devedor de R$ ${valorFaltante.toFixed(2)} irá para o Controle de Entregas.`);
        }
    } else {
        alert('Serviço finalizado com sucesso!');
    }

    const agoraIso = new Date().toISOString();

    if (valorPago > 0) {
        registrarEntrada(`${a.cliente}`, valorPago, agoraIso, a.bairro || 'Geral');
    }

    if (a.possuiColeta) {
        let dataEntrega = new Date();
        dataEntrega.setDate(dataEntrega.getDate() + 7);
        a.status = 'Em Entrega';
        a.prazoEntrega = dataEntrega.toISOString();
        a.valorFaltanteEntrega = valorFaltante;
    } else {
        a.status = 'Concluido';
    }

    fecharModalFinalizar();
    salvarDados();
};

// --- PENDÊNCIAS ---
function renderizarPendencias() {
    const container = document.getElementById('lista-pendencias');
    container.innerHTML = '';

    let html = '';
    const hoje = new Date();

    dados.agenda.forEach(a => {
        if (a.status === 'Em Entrega' && new Date(a.prazoEntrega) < hoje) {
            html += `
                <div class="item-card" style="border-left: 4px solid red;">
                    <strong>Atraso na Entrega: ${a.cliente}</strong>
                    <span>Prazo era: ${new Date(a.prazoEntrega).toLocaleDateString('pt-BR')}</span>
                    <span>Telefone: ${a.telefone}</span>
                </div>
            `;
        }
    });

    dados.pendencias.forEach(p => {
        html += `
            <div class="item-card" style="border-left: 4px solid orange;">
                <div class="item-header" onclick="alternarAcordeao(event)">
                    <span>${p.cliente} - R$ ${p.valorFaltante.toFixed(2)}</span>
                    <i class="fa-solid fa-chevron-down"></i>
                </div>
                <div class="item-detalhes">
                    <span>${p.descricao}</span>
                    <button class="btn-acao btn-concluir" onclick="abrirModalResolverPendencia(${p.id})">Resolver Pendência</button>
                </div>
            </div>
        `;
    });

    if (!html) html = `<p>Nenhuma pendência ou atraso registrado.</p>`;
    container.innerHTML = html;
}

function abrirModalResolverPendencia(id) {
    pendenciaIdResolvendo = id;
    const p = dados.pendencias.find(item => item.id == id);

    document.getElementById('pend-modal-cliente').innerText = `Cliente: ${p.cliente}`;
    document.getElementById('pend-modal-valor').innerText = `Valor Faltante Registrado: R$ ${p.valorFaltante.toFixed(2)}`;
    document.getElementById('pend-valor-pago-agora').value = '';
    document.getElementById('container-motivo-restante').style.display = 'none';
    document.getElementById('pend-motivo').value = '';

    document.getElementById('modal-resolver-pendencia').style.display = 'flex';
}

function fecharModalPendencia() {
    document.getElementById('modal-resolver-pendencia').style.display = 'none';
    pendenciaIdResolvendo = null;
}

function calcularRestantePendencia() {
    const p = dados.pendencias.find(item => item.id == pendenciaIdResolvendo);
    const pagoAgora = parseFloat(document.getElementById('pend-valor-pago-agora').value) || 0;
    const restante = p.valorFaltante - pagoAgora;

    const containerMotivo = document.getElementById('container-motivo-restante');
    if (restante > 0) {
        containerMotivo.style.display = 'block';
        document.getElementById('pend-valor-restante').innerText = `R$ ${restante.toFixed(2)}`;
    } else {
        containerMotivo.style.display = 'none';
    }
}

function confirmarResolucaoPendencia() {
    const p = dados.pendencias.find(item => item.id == pendenciaIdResolvendo);
    const pagoAgora = parseFloat(document.getElementById('pend-valor-pago-agora').value) || 0;
    const restante = p.valorFaltante - pagoAgora;
    const motivo = document.getElementById('pend-motivo').value;

    if (restante > 0 && !motivo) {
        alert('Selecione uma opção (Desconto ou Diferença cartão) para o valor restante.');
        return;
    }

    const agoraIso = new Date().toISOString();

    if (pagoAgora > 0) {
        registrarEntrada(`Pendência Recebida: ${p.cliente}`, pagoAgora, agoraIso, 'Pendência');
    }

    dados.pendencias = dados.pendencias.filter(item => item.id != pendenciaIdResolvendo);

    fecharModalPendencia();
    salvarDados();
}

// --- FINANCEIRO & GASTOS ---
function alternarParcelas(val) {
    const container = document.getElementById('container-parcelas');
    container.style.display = val === 'Parcelado' ? 'block' : 'none';
}

function salvarGasto(e) {
    e.preventDefault();
    const descricao = document.getElementById('gasto-descricao').value;
    const valorTotal = parseFloat(document.getElementById('gasto-valor').value);
    const categoria = document.getElementById('gasto-categoria').value;
    const tipoPgto = document.getElementById('gasto-tipo-pgto').value;
    const dataPrimeira = document.getElementById('gasto-data').value;

    if (!dados.gastos) dados.gastos = [];

    const agoraIso = new Date(dataPrimeira + 'T12:00:00').toISOString();

    if (tipoPgto === 'À Vista') {
        const gastoObj = {
            id: Date.now(),
            descricao,
            valor: valorTotal,
            categoria,
            data: dataPrimeira,
            dataHora: agoraIso
        };
        dados.gastos.push(gastoObj);
    } else {
        const qtdParcelas = parseInt(document.getElementById('gasto-qtd-parcelas').value) || 2;
        const valorParcela = valorTotal / qtdParcelas;
        let dataAtual = new Date(dataPrimeira + 'T12:00:00');

        for (let i = 1; i <= qtdParcelas; i++) {
            let dataStr = dataAtual.toISOString().split('T')[0];
            let parcelaIso = dataAtual.toISOString();
            dados.gastos.push({
                id: Date.now() + i,
                descricao: `${descricao} (${i}/${qtdParcelas})`,
                valor: valorParcela,
                categoria,
                data: dataStr,
                dataHora: parcelaIso
            });
            dataAtual.setMonth(dataAtual.getMonth() + 1);
        }
    }

    document.getElementById('form-gasto').reset();
    document.getElementById('container-parcelas').style.display = 'none';
    salvarDados();
}

function extrairAnoMes(item) {
    let raw = item.dataHora || item.data || '';
    if (!raw) return '';
    
    if (typeof raw === 'string' && raw.match(/^\d{2}-\d{2}-\d{2}/)) {
        let partes = raw.split(' ')[0].split('-');
        let ano = `20${partes[2]}`;
        let mes = partes[1];
        return `${ano}-${mes}`;
    }

    if (typeof raw === 'string' && raw.includes('-') && raw.length >= 7) {
        let partes = raw.split('T')[0].split('-');
        if (partes[0].length === 4) {
            return `${partes[0]}-${partes[1]}`;
        }
    }
    
    let d = new Date(raw);
    if (!isNaN(d.getTime())) {
        let y = d.getFullYear();
        let m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
    }
    return '';
}

function renderizarFinanceiro() {
    renderizarGraficoTorre();
    renderizarHistoricoMesAtual();
}

function renderizarGraficoTorre() {
    const container = document.getElementById('grafico-torre');
    container.innerHTML = '';

    let hoje = new Date();
    let meses = [];

    for (let i = 5; i >= 0; i--) {
        let d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        let anoMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        let nomeMes = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        meses.push({ anoMes, nomeMes });
    }

    let lucros = meses.map(m => {
        let entradas = 0;
        let saidas = 0;

        (dados.entradas || []).forEach(e => {
            if (extrairAnoMes(e) === m.anoMes) entradas += e.valor;
        });

        (dados.gastos || []).forEach(g => {
            if (extrairAnoMes(g) === m.anoMes) saidas += g.valor;
        });

        return entradas - saidas;
    });

    let maxLucro = Math.max(...lucros.map(l => Math.abs(l)), 100);

    meses.forEach((m, idx) => {
        let lucro = lucros[idx];
        let alturaPx = (Math.abs(lucro) / maxLucro) * 110;
        if (alturaPx < 10) alturaPx = 10;

        let selecionadaClass = (mesSelecionadoGrafico === m.anoMes) ? 'selecionada' : '';
        let corBarra = lucro >= 0 ? '#2563eb' : '#ef4444';

        container.innerHTML += `
            <div class="torre-coluna ${selecionadaClass}" onclick="selecionarMesGrafico('${m.anoMes}')">
                <span style="font-size:0.65rem; margin-bottom:2px;">R$ ${lucro.toFixed(0)}</span>
                <div class="torre-barra" style="height: ${alturaPx}px; background-color: ${corBarra};"></div>
                <span class="torre-label">${m.nomeMes}</span>
            </div>
        `;
    });

    if (mesSelecionadoGrafico) {
        atualizarResumoMesSelecionado();
    }
}

function selecionarMesGrafico(anoMes) {
    if (mesSelecionadoGrafico === anoMes) {
        mesSelecionadoGrafico = null;
        document.getElementById('dashboard-mes-selecionado').style.display = 'none';
        renderizarGraficoTorre();
        return;
    }
    mesSelecionadoGrafico = anoMes;
    renderizarGraficoTorre();
}

function atualizarResumoMesSelecionado() {
    const container = document.getElementById('dashboard-mes-selecionado');
    container.style.display = 'block';

    let totalEntradas = 0;
    let totalSaidas = 0;

    (dados.entradas || []).forEach(e => {
        if (extrairAnoMes(e) === mesSelecionadoGrafico) totalEntradas += e.valor;
    });

    (dados.gastos || []).forEach(g => {
        if (extrairAnoMes(g) === mesSelecionadoGrafico) totalSaidas += g.valor;
    });

    let lucro = totalEntradas - totalSaidas;

    document.getElementById('titulo-mes-sel').innerText = `Resumo do Mês: ${mesSelecionadoGrafico}`;
    document.getElementById('res-mes-entradas').innerText = `R$ ${totalEntradas.toFixed(2)}`;
    document.getElementById('res-mes-saidas').innerText = `R$ ${totalSaidas.toFixed(2)}`;
    document.getElementById('res-mes-lucro').innerText = `R$ ${lucro.toFixed(2)}`;
}

function abrirPlanilhaDetalhes() {
    if (!mesSelecionadoGrafico) return;

    let entradasFiltradas = (dados.entradas || []).filter(e => extrairAnoMes(e) === mesSelecionadoGrafico);
    let gastosFiltrados = (dados.gastos || []).filter(g => extrairAnoMes(g) === mesSelecionadoGrafico);

    let totalEntradas = 0;
    let totalSaidas = 0;
    let linhasTabela = '';

    entradasFiltradas.forEach(e => {
        totalEntradas += e.valor;
        let dataStr = e.dataHora ? formatarDataDDMMAA(e.dataHora) : (e.data || '');
        linhasTabela += `<tr><td>${dataStr}</td><td>Entrada</td><td>${e.desc}</td><td>${e.bairro || '-'}</td><td>R$ ${e.valor.toFixed(2)}</td></tr>`;
    });

    gastosFiltrados.forEach(g => {
        totalSaidas += g.valor;
        let dataStr = g.dataHora ? formatarDataDDMMAA(g.dataHora) : (g.data || '');
        linhasTabela += `<tr><td>${dataStr}</td><td>Saída</td><td>${g.descricao}</td><td>${g.categoria}</td><td>R$ ${g.valor.toFixed(2)}</td></tr>`;
    });

    let diferenca = totalEntradas - totalSaidas;

    let html = `
        <html>
        <head><title>Planilha Detalhada - ${mesSelecionadoGrafico}</title>
        <style>body{font-family:sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;margin-bottom:20px;} th,td{border:1px solid #cbd5e1;padding:8px;text-align:left;} th{background:#f1f5f9;}</style>
        </head>
        <body>
        <h2>Planilha Detalhada (${mesSelecionadoGrafico})</h2>
        <table>
            <tr><th>Data</th><th>Tipo</th><th>Descrição / Cliente</th><th>Categoria / Bairro</th><th>Valor</th></tr>
            ${linhasTabela}
        </table>
        <div style="background:#f1f5f9; padding:15px; border-radius:6px;">
            <p><strong>Total de Entradas:</strong> R$ ${totalEntradas.toFixed(2)}</p>
            <p><strong>Total de Saídas:</strong> R$ ${totalSaidas.toFixed(2)}</p>
            <p><strong>Valor em Caixa:</strong> R$ ${diferenca.toFixed(2)}</p>
        </div>
        </body>
        </html>
    `;

    let novaAba = window.open();
    novaAba.document.write(html);
}

function formatarDataDDMMAA(dataIso) {
    if (!dataIso) return '';
    let d = new Date(dataIso);
    if (isNaN(d)) return dataIso;
    let dia = String(d.getDate()).padStart(2, '0');
    let mes = String(d.getMonth() + 1).padStart(2, '0');
    let ano = String(d.getFullYear()).slice(-2);
    let hora = String(d.getHours()).padStart(2, '0');
    let min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}-${mes}-${ano} ${hora}:${min}`;
}

function renderizarHistoricoMesAtual() {
    const container = document.getElementById('lista-historico-mes');
    container.innerHTML = '';

    let mesAtualStr = new Date().toISOString().split('T')[0].substring(0, 7);
    
    let movimentos = [];
    (dados.entradas || []).forEach(e => {
        if (extrairAnoMes(e) === mesAtualStr) {
            movimentos.push({ ...e, tipo: 'entrada' });
        }
    });
    (dados.gastos || []).forEach(g => {
        if (extrairAnoMes(g) === mesAtualStr) {
            movimentos.push({ ...g, tipo: 'gasto', desc: g.descricao, bairro: g.categoria });
        }
    });

    movimentos.sort((a, b) => new Date(b.dataHora || 0) - new Date(a.dataHora || 0));

    let html = '';

    movimentos.forEach(m => {
        let isEntrada = m.tipo === 'entrada';
        let corFundo = isEntrada ? '#10b981' : '#ef4444';
        let dataFormatada = m.dataHora ? formatarDataDDMMAA(m.dataHora) : (m.data || '');
        let bairroTexto = (isEntrada && m.bairro) ? ` - ${m.bairro}` : (isEntrada ? '' : ` (${m.bairro})`);

        html += `
            <div class="item-card" style="background-color: ${corFundo}; color: #ffffff;">
                <div class="item-header" onclick="alternarAcordeao(event)" style="color: #ffffff;">
                    <span>${dataFormatada} — R$ ${m.valor.toFixed(2)}${bairroTexto}</span>
                    <i class="fa-solid fa-chevron-down"></i>
                </div>
                <div class="item-detalhes" style="border-top-color: rgba(255,255,255,0.3);">
                    <span><strong>Tipo:</strong> ${isEntrada ? 'Entrada (Caixa)' : 'Gasto (Saída)'}</span>
                    <span><strong>Detalhes:</strong> ${m.desc}</span>
                </div>
            </div>
        `;
    });

    if (!html) html = `<p>Nenhum movimento financeiro registrado neste mês.</p>`;
    container.innerHTML = html;
}

// --- DASHBOARD ---
function renderizarAgendaHojeEAtrasados() {
    const containerHoje = document.getElementById('lista-agenda-hoje');
    const containerAtrasados = document.getElementById('lista-agenda-atrasados');
    const divAtrasados = document.getElementById('container-atrasados');

    containerHoje.innerHTML = '';
    containerAtrasados.innerHTML = '';

    const agora = new Date();
    const hojeStr = agora.toISOString().split('T')[0];
    
    const naoFinalizados = dados.agenda.filter(a => a.status === 'Agendado');

    let hojeCount = 0;
    let atrasadosCount = 0;

    naoFinalizados.forEach(a => {
        let dataAgendamento = new Date(a.datahora);
        let dataStr = a.datahora.split('T')[0];
        const horaFormatada = dataAgendamento.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        const linkWpp = `https://wa.me/55${a.telefone.replace(/\D/g, '')}`;

        let cardHtml = `
            <div class="item-card">
                <div class="item-header" onclick="alternarAcordeao(event)">
                    <span>${horaFormatada} - ${a.cliente}</span>
                    <i class="fa-solid fa-chevron-down"></i>
                </div>
                <div class="item-detalhes">
                    <span><strong>Tipo:</strong> ${a.tipo}</span>
                    <span><strong>Endereço:</strong> ${a.endereco} <button class="btn-acao btn-pdf" style="padding:2px 6px;" onclick="copiarEnderecoTexto('${a.endereco}')">Copiar</button></span>
                    <a href="${linkWpp}" target="_blank" class="btn-acao btn-whatsapp" style="text-decoration:none; text-align:center;"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>
                </div>
            </div>
        `;

        if (dataStr === hojeStr) {
            hojeCount++;
            containerHoje.innerHTML += cardHtml;
        }

        if (dataAgendamento < agora) {
            atrasadosCount++;
            containerAtrasados.innerHTML += cardHtml;
        }
    });

    if (atrasadosCount > 0) {
        divAtrasados.style.display = 'block';
    } else {
        divAtrasados.style.display = 'none';
    }

    if (hojeCount === 0) {
        containerHoje.innerHTML = `<p>Nenhum compromisso agendado para hoje.</p>`;
    }
}

function atualizarDashboard() {
    let mesAtualStr = new Date().toISOString().split('T')[0].substring(0, 7);

    let totalPendencias = 0;
    dados.pendencias.forEach(p => {
        totalPendencias += p.valorFaltante;
    });
    document.getElementById('dash-min-pendencias').innerText = `R$ ${totalPendencias.toFixed(2)}`;

    let totalFaturamentoMes = 0;
    let totalGastosMes = 0;

    (dados.entradas || []).forEach(e => {
        if (extrairAnoMes(e) === mesAtualStr) totalFaturamentoMes += e.valor;
    });

    (dados.gastos || []).forEach(g => {
        if (extrairAnoMes(g) === mesAtualStr) totalGastosMes += g.valor;
    });

    let valorCaixaMes = totalFaturamentoMes - totalGastosMes;
    let pendentesEntregaCount = dados.agenda.filter(a => a.status === 'Em Entrega').length;

    document.getElementById('dash-faturamento').innerText = `R$ ${totalFaturamentoMes.toFixed(2)}`;
    document.getElementById('dash-gastos').innerText = `R$ ${totalGastosMes.toFixed(2)}`;
    document.getElementById('dash-lucro').innerText = `R$ ${valorCaixaMes.toFixed(2)}`;
    document.getElementById('dash-pendentes').innerText = pendentesEntregaCount;

    renderizarAgendaHojeEAtrasados();
}

function mudarAbaTabDireto(abaId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${abaId}`).classList.add('active');
}

function atualizarTudo() {
    renderizarServicos();
    renderizarAgenda();
    renderizarEntregas();
    renderizarPendencias();
    renderizarFinanceiro();
    atualizarDashboard();
}

// Inicializar aplicativo
atualizarTudo();