# Arduino Nano Setup com 3 Potenciômetros

## Hardware Necessário

- 1x Arduino Nano (ATmega328P)
- 3x Potenciômetros 10kΩ (ou qualquer valor entre 1k-100k)
- Cabo USB Mini-B (para Nano)
- Jumpers/fios para conexões

## Esquema de Conexões

```
Arduino Nano
┌─────────────────┐
│     [USB]       │
│                 │
│  A0 ─────●──────┤  Potenciômetro 1 (Master Volume)
│          ││     │  - Pino 1: GND
│  A1 ─────●●─────┤  - Pino 2: Sinal → A0
│          │││    │  - Pino 3: 5V
│  A2 ─────●●●────┤
│          │││    │  Potenciômetro 2 (Applications)
│  5V  ────┴┴┴────┤  - Pino 1: GND
│                 │  - Pino 2: Sinal → A1
│  GND ───────────┤  - Pino 3: 5V
│                 │
│  D13 [LED] ●────┤  Potenciômetro 3 (Microphone)
│                 │  - Pino 1: GND
└─────────────────┘  - Pino 2: Sinal → A2
                     - Pino 3: 5V
```

### Conexões Detalhadas

**Potenciômetro 1 (Knob 1 - Master):**
- Pino esquerdo → GND do Arduino
- Pino central (wiper) → A0 do Arduino
- Pino direito → 5V do Arduino

**Potenciômetro 2 (Knob 2 - Apps):**
- Pino esquerdo → GND do Arduino
- Pino central (wiper) → A1 do Arduino
- Pino direito → 5V do Arduino

**Potenciômetro 3 (Knob 3 - Mic):**
- Pino esquerdo → GND do Arduino
- Pino central (wiper) → A2 do Arduino
- Pino direito → 5V do Arduino

## Passo a Passo - Upload do Firmware

### 1. Conectar Arduino Nano

```bash
# Conecte o Arduino via USB
# Verifique a porta detectada
ls /dev/ttyUSB* /dev/ttyACM*
# Exemplo de saída: /dev/ttyUSB0
```

### 2. Configurar Permissões (se necessário)

```bash
# Adicionar usuário ao grupo dialout
sudo usermod -a -G dialout $USER

# Fazer logout e login novamente
# Ou executar:
newgrp dialout
```

### 3. Upload usando Arduino IDE

1. Abra Arduino IDE
2. File → Open → `arduino/iaruba-nano-3knobs/iaruba-nano-3knobs.ino`
3. Tools → Board → "Arduino Nano"
4. Tools → Processor → "ATmega328P" (ou "ATmega328P (Old Bootloader)" se necessário)
5. Tools → Port → "/dev/ttyUSB0" (ou sua porta)
6. Click "Upload" (→)

### 4. Upload usando arduino-cli (Alternativa)

```bash
# Instalar arduino-cli
curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh

# Compilar e fazer upload
arduino-cli compile --fqbn arduino:avr:nano arduino/iaruba-nano-3knobs
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano arduino/iaruba-nano-3knobs
```

## Verificar Funcionamento

### 1. Testar com Serial Monitor (Arduino IDE)

1. Tools → Serial Monitor
2. Baud Rate: 9600
3. Você deve ver algo como: `512|768|1023`
4. Gire os potenciômetros e veja os valores mudarem
5. LED no Arduino deve piscar quando valores mudam

### 2. Testar com Iarubá

```bash
# Descobrir a porta do Arduino Nano
ls -l /dev/ttyUSB* /dev/ttyACM*

# Exemplo: /dev/ttyUSB0

# Testar com test-serial
stack exec test-serial /dev/ttyUSB0
```

**Output esperado:**
```
🔌 Connecting to Arduino on /dev/ttyUSB0 at 9600 baud...
✅ Connected!
📊 Reading slider values... (Ctrl+C to exit)

🎚️  Sliders: [0: 512] [1: 768] [2:1023]
   Volumes: [0: 50%] [1: 75%] [2:100%]
```

## Troubleshooting

### Arduino não detectado
```bash
# Verifique se o driver CH340 está instalado (Nano clone)
lsusb | grep -i "CH340\|FT232\|Arduino"

# Se não aparecer nada, pode precisar do driver CH340
sudo modprobe ch341
```

### Permission denied
```bash
# Verificar permissões
ls -l /dev/ttyUSB0

# Dar permissão temporária (para teste)
sudo chmod 666 /dev/ttyUSB0

# Ou adicionar ao grupo dialout (permanente)
sudo usermod -a -G dialout $USER
# Logout e login novamente
```

### Upload falha com "programmer is not responding"
- Tente selecionar "ATmega328P (Old Bootloader)" nas ferramentas
- Verifique o cabo USB (alguns cabos só carregam, não transmitem dados)
- Pressione o botão reset no Arduino e tente upload novamente

### Valores erráticos
- Verifique as conexões dos potenciômetros
- Certifique-se que 5V e GND estão conectados corretamente
- Tente aumentar o noise_reduction no firmware (linha 60)

### LED não pisca
- LED integrado pode estar queimado (normal, não afeta funcionamento)
- Firmware ainda funciona normalmente

## Ajustar Configuração

Edite `config/nano-3knobs.yaml` para:
- Mudar porta serial
- Ajustar mapeamento de aplicações
- Configurar threshold de ruído

## Testar Aplicação Completa

```bash
# Com configuração específica para Nano
stack run -- --config config/nano-3knobs.yaml
```

## Próximos Passos

Após verificar que a comunicação funciona:
1. Integrar com PulseAudio
2. Testar controle de volume real
3. Implementar GUI

## Referências

- Arduino Nano Pinout: https://docs.arduino.cc/hardware/nano
- Potentiômetros: https://www.arduino.cc/en/Tutorial/BuiltInExamples/AnalogInput
