# Auditoria da Logica Legada

Esta matriz acompanha se os comportamentos importantes de Python/Haskell foram carregados para a nova base de codigo.

## Protocolo serial

- Python parse_line de legacy/arduino-audio-controller/audio_controller.py: implementado em packages/shared/src/protocol.ts
- Comportamento antigo de sanitizeSerialPayload e parseSliderData do Haskell (auditoria de migracao): implementado em packages/shared/src/protocol.ts
- Compatibilidade legada P1:512: preservada em parseSliderPacket

## Matematica dos sliders

- Python map_value: implementado em packages/shared/src/mixer.ts
- Haskell calculateVolume: implementado como sliderValueToNormalized
- Haskell applyNoiseReduction: implementado em packages/shared/src/mixer.ts
- Comportamento de primeiro pacote do Haskell: preservado tratando valores anteriores ausentes como aplicaveis imediatamente

## Snapshot de runtime e demo

- Haskell buildRuntimeSnapshot: implementado em packages/shared/src/runtime.ts
- Comportamento antigo de buildDemoFrame do Haskell: implementado em packages/shared/src/runtime.ts
- Resumo de knobs para UI, alvos, outcomes e diagnosticos: exposto via store Zustand em apps/desktop/src/store/ioruba-store.ts

## Persistencia e configuracoes

- Persistencia Haskell de UiSettings: migrada para persistencia JSON do perfil inteiro por load_persisted_state e save_persisted_state
- Modelo antigo dividido entre YAML config e UI state: substituido por payload JSON unico gerenciado pelo app desktop

## Alvos de audio

- Haskell MasterTarget: implementado em Rust via pactl set-sink-volume @DEFAULT_SINK@
- Haskell ApplicationTarget: implementado em Rust resolvendo sink inputs e aplicando volume nos streams correspondentes
- Haskell SourceTarget default_microphone: implementado em Rust com tratamento da source padrao e fallback para source nao-monitor
- Haskell SinkTarget default_output: implementado em Rust com tratamento de sink padrao
- Python set_master_volume e set_app_volume: preservados no backend Linux em Rust

## Auto-reconexao e controle de runtime

- Loop antigo de reconexao serial em Haskell: substituido por auto-reconexao do plugin serial Tauri + timeout de heartbeat em use-serial-runtime.ts
- Toggle de modo demo: implementado na store Zustand e no hook de runtime
- Persistencia de porta preferida: implementada no perfil persistido e no hook de conexao

## Cobertura de testes adicionada

- testes de protocolo e mixer compartilhados em packages/shared/tests/protocol.test.ts
- testes de store desktop em apps/desktop/src/store/ioruba-store.test.ts
- testes de parser Rust em apps/desktop/src-tauri/src/audio/linux.rs

## Gaps conhecidos

- O novo backend Linux esta implementado para controle real de audio.
- Instaladores Windows e macOS sao gerados pela CI, mas o backend de audio especifico dessas plataformas ainda e um stub explicito. O shell desktop funciona nelas; o controle real por alvo continua Linux-first nesta migracao.
