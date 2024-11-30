import { CreateWebWorkerMLCEngine  } from "https://esm.run/@mlc-ai/web-llm";

const $ = el => document.querySelector(el)
const $template = $('#message-template')
const $messages = $('.messages')
const $form = $('#form')
const $input = $('#input-message')
const $small = $('#mic-result')
const $preview = $('#preview-download')
const $waitingMessage = $('#waiting-message')
const $errorMessage = document.querySelector('.error-message')

const selectModel = "Llama-3.1-8B-Instruct-q4f32_1-MLC-1k";

let messages = []
let completed = false

let engine;

try {
    engine = await CreateWebWorkerMLCEngine(
        new Worker('./worker.js', { type: 'module' }),
        selectModel,
        {
            initProgressCallback: (info) => {
                $errorMessage.classList.remove('animate')
                $preview.textContent = info.text

                if (info.progress === 1 && !completed) {
                    completed = true
                    $waitingMessage.parentNode.removeChild($waitingMessage)
                    document.querySelectorAll('button').forEach(button => button.disabled = false)
                    addMessage('¡Ya estoy listo para responder!', 'bot')
                }
            }
        }
    )
} catch (error) {
    console.error(error)
    $errorMessage.classList.add('animate')
}

$form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const messageUser = $input.value.trim()
    if (messageUser.length === 0) return
    addMessage(messageUser, 'user')
    getIAResponse(messageUser)
})

async function getIAResponse(textFromUser) {
    try {
        const userMesage = {
            role: "user",
            content: textFromUser
        }
    
        messages.push(userMesage)
    
        const chuncks = await engine.chat.completions.create({
            messages,
            stream: true,
        });
        
        let reply = "";
        
        const $textBot = addMessage("", 'bot')
        
        for await (const chunk of chuncks) {
            const choice = chunk.choices[0]
            const content = choice?.delta?.content ?? ""
            reply += content
            $textBot.textContent = reply
            $messages.scrollTop = $messages.scrollHeight
        }
    
        messages.push({ role: "assistant", content: reply })
    } catch (error) {
        console.error(error)
        addMessage('Lo siento pero has llegó al los tokens máximos de la sesión.', 'bot') 
    }
}

function addMessage(text, sender) {
    if ($small.textContent !== '') $small.textContent = ''

    $input.value = ''

    const clonedTemplate = $template.content.cloneNode(true)
    const $newMessage = clonedTemplate.querySelector('.message')

    const $who = $newMessage.querySelector('span > img')
    const $text = $newMessage.querySelector('p')
    $text.textContent = text
    $who.src = sender === 'bot' ? '/svg/icon-ia.svg' : '/svg/icon-user.svg'
    $who.alt = sender === 'bot' ? 'Icono IA' : 'Icono usuario'
    $newMessage.classList.add(sender)
    $messages.appendChild($newMessage)
    
    $messages.scrollTop = $messages.scrollHeight

    return $text
}


if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'es-ES';
    recognition.interimResults = false; 

    recognition.onstart = function() {
        $input.placeholder = 'Escuchando...';
    };

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        const textGeneratedFromVoice = $input.value = transcript;
        addMessage(textGeneratedFromVoice, 'user')
        getIAResponse(textGeneratedFromVoice)
    };

    recognition.onerror = function(event) {
        console.error('Error en el reconocimiento:', event.error);
        $small.textContent = 'Error en el reconocimiento de voz: ' + event.error + ' | Intenta probar en otro navegador como "Edge"';
    };

    recognition.onend = function() {
        $input.placeholder = 'Escribe tu mensaje aquí o hazlo a través del micrófono.';
    };

    document.getElementById('startBtn').onclick = function() {
        recognition.start();
    };
} else {
    alert('Lo siento, tu navegador no soporta el reconocimiento de voz.');
}