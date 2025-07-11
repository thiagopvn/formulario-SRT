let currentStep = 1;
let steps;

function showStep(step) {
    steps.forEach((s, i) => {
        s.style.display = (i + 1 === step) ? 'block' : 'none';
    });
}

function validateStep(step) {
    const currentStepFields = document.querySelectorAll(`#step-${step} [required]`);
    for (const field of currentStepFields) {
        if (!field.value.trim()) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            field.focus();
            return false;
        }
    }
    return true;
}

function nextStep() {
    if (!validateStep(currentStep)) {
        return; // Para a execução se a validação falhar
    }

    if (currentStep < 5) {
        currentStep++;
        showStep(currentStep);
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    steps = document.querySelectorAll('.form-step');
    showStep(currentStep);

    document.getElementById('add-morador').addEventListener('click', () => {
        const moradorDiv = document.createElement('div');
        moradorDiv.classList.add('morador', 'mb-3');
        moradorDiv.innerHTML = `
            <div class="form-group">
                <label>Nome do Morador</label>
                <input type="text" class="form-control nome-morador" required>
            </div>
            <div class="form-group">
                <label>Data de Nascimento</label>
                <input type="date" class="form-control data-nascimento-morador" required>
            </div>
            <button type="button" class="btn btn-danger btn-sm remove-morador">Remover</button>
        `;
        document.getElementById('moradores-container').appendChild(moradorDiv);
    });

    document.getElementById('moradores-container').addEventListener('click', e => {
        if (e.target.classList.contains('remove-morador')) {
            e.target.closest('.morador').remove();
        }
    });

    document.getElementById('form-usuario').addEventListener('submit', e => {
        e.preventDefault();

        const comentarios = document.getElementById('comentarios').value;
        // Lógica para enviar o formulário, incluindo os comentários
        console.log('Comentários:', comentarios);

        alert('Formulário enviado com sucesso!');
    });
});