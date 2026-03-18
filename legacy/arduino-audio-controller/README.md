# 🎛️ Arduino Audio Controller

Controlador de áudio físico para Linux usando Arduino Nano e potenciômetros B10K. Desenvolvido com Python (GTK4/LibAdwaita) e Firmware C++.

![Screenshot](screenshot.png)

## 📋 Descrição do Repositório (GitHub)

**Descrição:** Controlador de volume físico para Linux usando Arduino Nano e Python/GTK4. Controle volumes de apps individuais (Spotify, Chrome) via potenciômetros.
**Tags:** `arduino` `linux` `python` `gtk4` `libadwaita` `pulseaudio` `volume-mixer` `maker` `hardware`

## ✅ TO-DO

- [x] Criar e adicionar `icon.png` ao repositório
- [x] Adicionar screenshot atualizada da interface (`screenshot.png`)
- [x] Implementar seletor de aplicativos na GUI
- [x] Adicionar suporte a PipeWire nativo (via compatibilidade pulsectl/pipewire-pulse)
- [ ] Criar pacote AUR para fácil instalação no Arch Linux
- [x] Melhorar tratamento de desconexão USB

## 🏗️ Arquitetura e Protocolo

### Comunicação Serial
O Arduino envia leituras dos potenciômetros via Serial (9600 baud) no formato:
`P<ID>:<VALOR>`
- `ID`: Número do potenciômetro (1, 2, 3)
- `VALOR`: Leitura analógica (0-1023)

Exemplo: `P1:512` (Potenciômetro 1 em 50%)

### Estrutura do Software
1. **Firmware (.ino)**: Loop de leitura com *debounce* simples. Envia dados apenas quando há variação significativa (`THRESHOLD = 5`).
2. **Backend Python**: Thread dedicada lê a porta Serial.
3. **PulseAudio Bridge**: Mapeia valores 0-1023 para 0.0-1.0 e aplica ao *Sink* (Master) ou *SinkInput* (Apps) correspondente usando `pulsectl`.
4. **GUI (GTK4)**: Exibe níveis em tempo real e gerencia conexão. Atualizações de UI são feitas via `GLib.idle_add` para thread-safety.

## ✨ Características

- 🔊 Controle de volume master do sistema
- 🌐 Controle individual do Google Chrome
- 🎵 Controle individual do Spotify
- 🎨 Interface gráfica moderna com GTK4/Adwaita
- 🚀 Inicia automaticamente com o sistema
- 🔌 Detecção automática do Arduino

## 🛠️ Hardware Necessário

- 1x Arduino Nano V3 ATmega328P (USB-C)
- 3x Potenciômetros B10K (10kΩ)
- Jumpers

## 🔌 Esquema de Conexão
```
Arduino Nano:
├─ Potenciômetro 1 (Volume Master)
│  ├─ Pino central → A0
│  ├─ Extremo 1 → 5V
│  └─ Extremo 2 → GND
│
├─ Potenciômetro 2 (Google Chrome)
│  ├─ Pino central → A1
│  ├─ Extremo 1 → 5V
│  └─ Extremo 2 → GND
│
└─ Potenciômetro 3 (Spotify)
   ├─ Pino central → A2
   ├─ Extremo 1 → 5V
   └─ Extremo 2 → GND
```

## 📦 Instalação (Arch Linux)

### 1. Instalar dependências
```bash
sudo pacman -S arduino-cli python python-gobject gtk4 libadwaita imagemagick
```

### 2. Clonar repositório
```bash
git clone https://github.com/bernardopg/arduino-audio-controller.git
cd arduino-audio-controller
```

### 3. Criar ambiente virtual
```bash
python -m venv venv
source venv/bin/activate
pip install pyserial pulsectl
```

### 4. Carregar código no Arduino
```bash
arduino-cli core update-index
arduino-cli core install arduino:avr
arduino-cli compile --fqbn arduino:avr:nano:cpu=atmega328old arduino_audio_controller
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:nano:cpu=atmega328old arduino_audio_controller
```

### 5. Instalar aplicação
```bash
# Copiar ícone
mkdir -p ~/.local/share/icons/hicolor/128x128/apps
cp icon.png ~/.local/share/icons/hicolor/128x128/apps/audio-controller.png
gtk-update-icon-cache ~/.local/share/icons/hicolor/

# Instalar .desktop
mkdir -p ~/.local/share/applications
cp audio-controller.desktop ~/.local/share/applications/
update-desktop-database ~/.local/share/applications/

# Ativar autostart
mkdir -p ~/.config/autostart
cp audio-controller.desktop ~/.config/autostart/
```

## 🚀 Uso

### Iniciar manualmente
```bash
./audio_controller_gui_wrapper.sh
```

### Linha de comando (alternativa)
```bash
cd arduino_audio_controller
source venv/bin/activate
python audio_controller.py -a chrome -b spotify
```

## 🎯 Customização

Para controlar outras aplicações, edite `audio_controller_gui.py`:
```python
self.app1_name = "firefox"  # Mude para sua aplicação
self.app2_name = "discord"  # Mude para sua aplicação
```

Ou use a versão CLI:
```bash
python audio_controller.py -a firefox -b vlc
```

## 📋 Troubleshooting

### Arduino não detectado
```bash
sudo usermod -a -G uucp $USER
sudo chmod 666 /dev/ttyUSB0
```

### Verificar porta serial
```bash
ls /dev/tty* | grep -E "USB|ACM"
```

### Listar aplicações de áudio ativas
```bash
python audio_controller.py --list
```

## 🤝 Contribuindo

Pull requests são bem-vindos! Para mudanças grandes, abra uma issue primeiro.

## 📝 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 👤 Autor

**Bernardo Gomes (bitter)**

- GitHub: [@bernardopg](https://github.com/bernardopg)

## 🙏 Agradecimentos

- Comunidade Arduino
- Projeto PulseAudio
- GTK/GNOME Team
