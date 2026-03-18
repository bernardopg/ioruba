#!/usr/bin/env python3
import serial
import serial.tools.list_ports
import pulsectl
import time
import sys

BAUD_RATE = 9600

class AudioController:
    def __init__(self):
        self.pulse = pulsectl.Pulse('audio-controller')
        self.ser = None
        
    def find_arduino(self):
        """Encontra automaticamente o Arduino Nano"""
        ports = serial.tools.list_ports.comports()
        for port in ports:
            if 'USB' in port.device or 'ACM' in port.device:
                try:
                    ser = serial.Serial(port.device, BAUD_RATE, timeout=1)
                    print(f"✓ Arduino encontrado em: {port.device}")
                    return ser
                except:
                    continue
        return None
    
    def connect_serial(self, port=None):
        try:
            if port:
                self.ser = serial.Serial(port, BAUD_RATE, timeout=1)
            else:
                self.ser = self.find_arduino()
            
            if not self.ser:
                print("✗ Arduino não encontrado!")
                return False
            
            time.sleep(2)
            return True
        except serial.SerialException as e:
            print(f"✗ Erro ao conectar: {e}")
            return False
    
    def map_value(self, arduino_value):
        """Mapeia 0-1023 para 0.0-1.0"""
        return max(0.0, min(1.0, arduino_value / 1023.0))
    
    def set_master_volume(self, volume):
        try:
            for sink in self.pulse.sink_list():
                self.pulse.volume_set_all_chans(sink, volume)
        except Exception as e:
            print(f"✗ Erro master volume: {e}")
    
    def set_app_volume(self, app_name, volume):
        try:
            found = False
            for sink_input in self.pulse.sink_input_list():
                app = sink_input.proplist.get('application.name', '').lower()
                if app_name.lower() in app:
                    self.pulse.volume_set_all_chans(sink_input, volume)
                    found = True
            return found
        except Exception as e:
            return False
    
    def list_applications(self):
        print("\n📱 Aplicações de áudio ativas:")
        apps = []
        for sink_input in self.pulse.sink_input_list():
            app_name = sink_input.proplist.get('application.name', 'Unknown')
            if app_name not in apps:
                apps.append(app_name)
                print(f"  - {app_name}")
        if not apps:
            print("  (Nenhuma aplicação de áudio ativa)")
        print()
    
    def run(self, app1="firefox", app2="spotify"):
        if not self.connect_serial():
            return
        
        print("\n" + "="*50)
        print("🎛️  CONTROLADOR DE ÁUDIO INICIADO")
        print("="*50)
        print(f"🎚️  P1 (A0) = Volume Master")
        print(f"🎚️  P2 (A1) = {app1.title()}")
        print(f"🎚️  P3 (A2) = {app2.title()}")
        print("\nPressione Ctrl+C para sair\n")
        
        self.list_applications()
        
        try:
            while True:
                if self.ser.in_waiting > 0:
                    line = self.ser.readline().decode('utf-8', errors='ignore').strip()
                    
                    if ':' not in line:
                        continue
                    
                    pot, val = line.split(':', 1)
                    value = int(val)
                    volume = self.map_value(value)
                    percent = int(volume * 100)
                    
                    if pot == 'P1':
                        self.set_master_volume(volume)
                        print(f"🔊 Master: {percent:3d}% {'█' * (percent // 5)}")
                    
                    elif pot == 'P2':
                        if self.set_app_volume(app1, volume):
                            print(f"🎵 {app1.title()}: {percent:3d}% {'█' * (percent // 5)}")
                    
                    elif pot == 'P3':
                        if self.set_app_volume(app2, volume):
                            print(f"🎵 {app2.title()}: {percent:3d}% {'█' * (percent // 5)}")
                
        except KeyboardInterrupt:
            print("\n\n👋 Encerrando controlador de áudio...")
        finally:
            if self.ser:
                self.ser.close()
            self.pulse.close()

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Controlador de Áudio Arduino')
    parser.add_argument('-p', '--port', help='Porta serial (ex: /dev/ttyUSB0)')
    parser.add_argument('-a', '--app1', default='firefox', help='Nome da aplicação 1')
    parser.add_argument('-b', '--app2', default='spotify', help='Nome da aplicação 2')
    parser.add_argument('-l', '--list', action='store_true', help='Lista aplicações e sai')
    
    args = parser.parse_args()
    
    controller = AudioController()
    
    if args.list:
        controller.list_applications()
        sys.exit(0)
    
    controller.run(args.app1, args.app2)
