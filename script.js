document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const apiKeyInput = document.getElementById('apiKey');
    const getNumberBtn = document.getElementById('getNumber');
    const loadingDiv = document.getElementById('loading');
    const numberResultDiv = document.getElementById('numberResult');
    const phoneNumberSpan = document.getElementById('phoneNumber');
    const requestIdSpan = document.getElementById('requestId');
    const smsMessagesDiv = document.getElementById('smsMessages');
    const checkSMSBtn = document.getElementById('checkSMS');
    const newNumberBtn = document.getElementById('newNumber');
    const copyNumberBtn = document.getElementById('copyNumber');
    const balanceSpan = document.getElementById('balance');
    const addBalanceBtn = document.getElementById('addBalance');

    // Variables de estado
    let currentRequestId = null;
    let currentNumber = null;
    let userBalance = 0;
    let smsCheckInterval = null;

    // Cargar datos guardados
    loadSavedData();

    // Event Listeners
    getNumberBtn.addEventListener('click', requestNumber);
    checkSMSBtn.addEventListener('click', checkSMS);
    newNumberBtn.addEventListener('click', resetOrder);
    copyNumberBtn.addEventListener('click', copyNumberToClipboard);
    addBalanceBtn.addEventListener('click', addBalance);

    // Función para solicitar un nuevo número
    async function requestNumber() {
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            alert('Por favor ingresa tu API Key de SMSPool');
            return;
        }

        // Simular costo (en un sistema real esto se haría en el backend)
        if (userBalance < 0.5) {
            alert('Saldo insuficiente. Recarga tu saldo primero.');
            return;
        }

        // Mostrar carga
        loadingDiv.classList.remove('hidden');
        getNumberBtn.disabled = true;

        try {
            // Configurar parámetros para WhatsApp USA
            const country = 'US';
            const service = 'WhatsApp';
            
            // Hacer la petición a la API de SMSPool
            const response = await fetch(`https://smspool.net/api/request?key=${apiKey}&country=${country}&service=${service}`);
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Guardar datos
            currentRequestId = data.id;
            currentNumber = data.number;
            
            // Actualizar UI
            phoneNumberSpan.textContent = `+1 ${currentNumber}`;
            requestIdSpan.textContent = currentRequestId;
            
            // Restar saldo (simulación)
            userBalance -= 0.5;
            updateBalance();
            
            // Mostrar resultados
            loadingDiv.classList.add('hidden');
            numberResultDiv.classList.remove('hidden');
            
            // Iniciar verificación periódica de SMS
            startSMSChecking(apiKey);
            
            // Guardar en localStorage
            saveData();
            
        } catch (error) {
            console.error('Error:', error);
            alert(`Error al solicitar número: ${error.message}`);
            loadingDiv.classList.add('hidden');
            getNumberBtn.disabled = false;
        }
    }

    // Función para verificar SMS
    async function checkSMS() {
        const apiKey = apiKeyInput.value.trim();
        
        if (!currentRequestId) {
            alert('No hay una solicitud activa');
            return;
        }

        try {
            const response = await fetch(`https://smspool.net/api/check?id=${currentRequestId}&key=${apiKey}`);
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (data.sms && data.sms.length > 0) {
                const smsList = data.sms.map(sms => {
                    return `<div class="sms-message">
                        <strong>${new Date(sms.date).toLocaleTimeString()}:</strong>
                        <p>${sms.text}</p>
                    </div>`;
                }).join('');
                
                smsMessagesDiv.innerHTML = smsList;
            } else {
                smsMessagesDiv.innerHTML = 'Aún no se ha recibido ningún SMS';
            }
        } catch (error) {
            console.error('Error:', error);
            alert(`Error al verificar SMS: ${error.message}`);
        }
    }

    // Función para verificar SMS automáticamente
    function startSMSChecking(apiKey) {
        // Limpiar intervalo anterior si existe
        if (smsCheckInterval) {
            clearInterval(smsCheckInterval);
        }
        
        // Verificar cada 5 segundos
        smsCheckInterval = setInterval(async () => {
            try {
                const response = await fetch(`https://smspool.net/api/check?id=${currentRequestId}&key=${apiKey}`);
                const data = await response.json();

                if (data.sms && data.sms.length > 0) {
                    const smsList = data.sms.map(sms => {
                        return `<div class="sms-message">
                            <strong>${new Date(sms.date).toLocaleTimeString()}:</strong>
                            <p>${sms.text}</p>
                        </div>`;
                    }).join('');
                    
                    smsMessagesDiv.innerHTML = smsList;
                    
                    // Detener la verificación si recibimos SMS
                    clearInterval(smsCheckInterval);
                    smsCheckInterval = null;
                }
            } catch (error) {
                console.error('Error en verificación automática:', error);
            }
        }, 5000);
    }

    // Función para reiniciar el proceso
    function resetOrder() {
        if (smsCheckInterval) {
            clearInterval(smsCheckInterval);
            smsCheckInterval = null;
        }
        
        currentRequestId = null;
        currentNumber = null;
        smsMessagesDiv.innerHTML = 'Esperando código de verificación...';
        numberResultDiv.classList.add('hidden');
        getNumberBtn.disabled = false;
        
        saveData();
    }

    // Función para copiar número al portapapeles
    function copyNumberToClipboard() {
        if (!currentNumber) return;
        
        navigator.clipboard.writeText(`+1${currentNumber}`)
            .then(() => {
                const originalText = copyNumberBtn.textContent;
                copyNumberBtn.textContent = '¡Copiado!';
                setTimeout(() => {
                    copyNumberBtn.textContent = originalText;
                }, 2000);
            })
            .catch(err => {
                console.error('Error al copiar:', err);
            });
    }

    // Función para añadir saldo (simulación)
    function addBalance() {
        const amount = parseFloat(prompt('Ingresa el monto a recargar (ej: 5.00):'));
        
        if (!isNaN(amount) && amount > 0) {
            userBalance += amount;
            updateBalance();
            saveData();
            alert(`Saldo recargado: $${amount.toFixed(2)}`);
        } else {
            alert('Monto inválido');
        }
    }

    // Función para actualizar el saldo en la UI
    function updateBalance() {
        balanceSpan.textContent = `$${userBalance.toFixed(2)}`;
    }

    // Función para guardar datos en localStorage
    function saveData() {
        localStorage.setItem('whatsappUSAUserData', JSON.stringify({
            apiKey: apiKeyInput.value.trim(),
            balance: userBalance,
            requestId: currentRequestId,
            phoneNumber: currentNumber
        }));
    }

    // Función para cargar datos guardados
    function loadSavedData() {
        const savedData = localStorage.getItem('whatsappUSAUserData');
        
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                
                if (data.apiKey) apiKeyInput.value = data.apiKey;
                if (data.balance) userBalance = data.balance;
                
                if (data.requestId && data.phoneNumber) {
                    currentRequestId = data.requestId;
                    currentNumber = data.phoneNumber;
                    phoneNumberSpan.textContent = `+1 ${currentNumber}`;
                    requestIdSpan.textContent = currentRequestId;
                    numberResultDiv.classList.remove('hidden');
                    getNumberBtn.disabled = true;
                    
                    // Reiniciar verificación de SMS
                    startSMSChecking(data.apiKey);
                }
                
                updateBalance();
            } catch (error) {
                console.error('Error al cargar datos:', error);
            }
        }
    }
});
