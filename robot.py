#!/usr/bin/env python3
"""
YouTube Kids Voice Controller
A complete voice-controlled interface for YouTube Kids using "Hey Robot" wake word.
"""

import whisper
import pyaudio
import numpy as np
import threading
import time
import queue
from collections import deque
import tkinter as tk
from tkinter import ttk, scrolledtext
import selenium
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
import speech_recognition as sr
from datetime import datetime
import re


class YouTubeKidsVoiceController:
    def __init__(self):
        # Initialize Whisper model
        self.whisper_model = None
        self.load_whisper_model()

        # Audio settings
        self.CHUNK = 1024
        self.FORMAT = pyaudio.paFloat32
        self.CHANNELS = 1
        self.RATE = 16000
        self.RECORD_SECONDS = 3

        # Control flags
        self.listening = False
        self.processing = False
        self.driver = None

        # Audio buffer for wake word detection
        self.audio_buffer = deque(maxlen=self.RATE * 3)  # 3 seconds buffer

        # Initialize GUI
        self.setup_gui()

        # Start YouTube Kids
        self.setup_youtube_kids()

    def load_whisper_model(self):
        """Load Whisper model with error handling"""
        try:
            print("Loading Whisper model...")
            self.whisper_model = whisper.load_model("base")
            print("✅ Whisper model loaded successfully!")
        except Exception as e:
            print(f"❌ Error loading Whisper model: {e}")
            print("Please install whisper: pip install openai-whisper")

    def setup_gui(self):
        """Create the main GUI interface"""
        self.root = tk.Tk()
        self.root.title("🤖 YouTube Kids Voice Controller")
        self.root.geometry("600x500")
        self.root.configure(bg='#2c3e50')

        # Style configuration
        style = ttk.Style()
        style.theme_use('clam')

        # Main frame
        main_frame = ttk.Frame(self.root, padding="20")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        # Title
        title_label = tk.Label(
            main_frame,
            text="🤖 Hey Robot - YouTube Kids Controller",
            font=("Arial", 18, "bold"),
            bg='#2c3e50',
            fg='white'
        )
        title_label.grid(row=0, column=0, columnspan=2, pady=(0, 20))

        # Status frame
        status_frame = ttk.LabelFrame(main_frame, text="Status", padding="10")
        status_frame.grid(row=1, column=0, columnspan=2,
                          sticky=(tk.W, tk.E), pady=(0, 20))

        self.status_label = tk.Label(
            status_frame,
            text="🔴 Not Listening",
            font=("Arial", 12, "bold"),
            bg='white',
            fg='red'
        )
        self.status_label.pack()

        # Control buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=2, column=0, columnspan=2, pady=(0, 20))

        self.start_btn = ttk.Button(
            button_frame,
            text="🎤 Start Listening",
            command=self.toggle_listening,
            width=15
        )
        self.start_btn.grid(row=0, column=0, padx=(0, 10))

        self.test_btn = ttk.Button(
            button_frame,
            text="🎯 Test Command",
            command=self.test_command,
            width=15
        )
        self.test_btn.grid(row=0, column=1, padx=(10, 0))

        # Command examples
        examples_frame = ttk.LabelFrame(
            main_frame, text="Voice Commands", padding="10")
        examples_frame.grid(row=3, column=0, columnspan=2,
                            sticky=(tk.W, tk.E), pady=(0, 20))

        examples_text = """
Say "Hey Robot" followed by:
• "Find baby shark videos"
• "Search for peppa pig" 
• "Play video" / "Pause video"
• "Toggle fullscreen"
• "Next video" / "Previous video"
• "Volume up" / "Volume down"
• "Go back"
        """.strip()

        examples_label = tk.Label(
            examples_frame,
            text=examples_text,
            justify=tk.LEFT,
            bg='white',
            font=("Arial", 10)
        )
        examples_label.pack(fill=tk.BOTH, expand=True)

        # Log area
        log_frame = ttk.LabelFrame(
            main_frame, text="Activity Log", padding="10")
        log_frame.grid(row=4, column=0, columnspan=2, sticky=(
            tk.W, tk.E, tk.N, tk.S), pady=(0, 10))

        self.log_text = scrolledtext.ScrolledText(
            log_frame,
            height=10,
            width=70,
            font=("Courier", 9)
        )
        self.log_text.pack(fill=tk.BOTH, expand=True)

        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(0, weight=1)
        main_frame.rowconfigure(4, weight=1)

    def setup_youtube_kids(self):
        """Initialize YouTube Kids in browser"""
        try:
            self.log_message("🌐 Starting YouTube Kids...")

            # Chrome options
            chrome_options = Options()
            chrome_options.add_argument(
                "--disable-blink-features=AutomationControlled")
            chrome_options.add_experimental_option(
                "excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option(
                'useAutomationExtension', False)
            chrome_options.add_argument("--start-maximized")

            # Initialize driver
            self.driver = webdriver.Chrome(options=chrome_options)
            self.driver.execute_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

            # Navigate to YouTube Kids
            self.driver.get("https://www.youtubekids.com/")

            self.log_message("✅ YouTube Kids loaded successfully!")

        except Exception as e:
            self.log_message(f"❌ Error loading YouTube Kids: {e}")
            self.log_message(
                "Please install ChromeDriver: pip install selenium")

    def log_message(self, message):
        """Add message to log with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message}\n"

        if hasattr(self, 'log_text'):
            self.log_text.insert(tk.END, log_entry)
            self.log_text.see(tk.END)

        print(log_entry.strip())

    def toggle_listening(self):
        """Start/stop listening for voice commands"""
        if not self.listening:
            self.start_listening()
        else:
            self.stop_listening()

    def start_listening(self):
        """Start continuous listening for 'Hey Robot'"""
        if not self.whisper_model:
            self.log_message("❌ Whisper model not loaded!")
            return

        self.listening = True
        self.update_status("🎤 Listening for 'Hey Robot'...", "green")
        self.start_btn.configure(text="🛑 Stop Listening")

        # Start listening thread
        self.listen_thread = threading.Thread(
            target=self.continuous_listen, daemon=True)
        self.listen_thread.start()

        self.log_message("🎤 Started listening for 'Hey Robot'")

    def stop_listening(self):
        """Stop listening"""
        self.listening = False
        self.update_status("🔴 Not Listening", "red")
        self.start_btn.configure(text="🎤 Start Listening")
        self.log_message("🛑 Stopped listening")

    def update_status(self, text, color):
        """Update status label"""
        self.status_label.configure(text=text, fg=color)

    def continuous_listen(self):
        """Main listening loop for wake word detection"""
        try:
            p = pyaudio.PyAudio()
            stream = p.open(
                format=self.FORMAT,
                channels=self.CHANNELS,
                rate=self.RATE,
                input=True,
                frames_per_buffer=self.CHUNK
            )

            while self.listening:
                try:
                    # Read audio data
                    data = stream.read(self.CHUNK, exception_on_overflow=False)
                    audio_chunk = np.frombuffer(data, dtype=np.float32)

                    # Add to buffer
                    self.audio_buffer.extend(audio_chunk)

                    # Check for speech activity (volume threshold)
                    if np.max(np.abs(audio_chunk)) > 0.01:
                        # Process buffer for wake word
                        if len(self.audio_buffer) >= self.RATE * 2:  # At least 2 seconds
                            self.check_for_wake_word()

                    # Small delay to prevent excessive CPU usage
                    time.sleep(0.05)

                except Exception as e:
                    if self.listening:  # Only log if we're supposed to be listening
                        self.log_message(f"Audio processing error: {e}")

            stream.stop_stream()
            stream.close()
            p.terminate()

        except Exception as e:
            self.log_message(f"❌ Listening error: {e}")
            self.listening = False
            self.update_status("❌ Listening Error", "red")

    def check_for_wake_word(self):
        """Check if wake word 'Hey Robot' was said"""
        if self.processing:
            return

        try:
            # Get recent audio
            audio_array = np.array(list(self.audio_buffer))

            # Transcribe with Whisper
            result = self.whisper_model.transcribe(
                audio_array,
                language="en",
                task="transcribe",
                fp16=False,
                temperature=0.0
            )

            text = result["text"].lower().strip()

            # Check for wake word
            if self.detect_wake_word(text):
                self.log_message(f"🤖 Wake word detected in: '{text}'")
                self.update_status("🎯 Listening for command...", "blue")
                self.listen_for_command()

        except Exception as e:
            # Don't spam errors, wake word detection fails are normal
            pass

    def detect_wake_word(self, text):
        """Detect various forms of 'Hey Robot'"""
        wake_patterns = [
            r"hey robot",
            r"hey robot[s]?",
            r"a robot",
            r"hey robert",
            r"hey robots"
        ]

        return any(re.search(pattern, text) for pattern in wake_patterns)

    def listen_for_command(self):
        """Listen for command after wake word detected"""
        self.processing = True

        try:
            # Record audio for command
            p = pyaudio.PyAudio()
            stream = p.open(
                format=self.FORMAT,
                channels=self.CHANNELS,
                rate=self.RATE,
                input=True,
                frames_per_buffer=self.CHUNK
            )

            frames = []
            # Record for 4 seconds
            for _ in range(0, int(self.RATE / self.CHUNK * 4)):
                data = stream.read(self.CHUNK)
                frames.append(data)

            stream.stop_stream()
            stream.close()
            p.terminate()

            # Convert to numpy array
            audio_data = b''.join(frames)
            audio_array = np.frombuffer(audio_data, dtype=np.float32)

            # Transcribe command
            result = self.whisper_model.transcribe(
                audio_array,
                language="en",
                task="transcribe"
            )

            command = result["text"].strip()
            self.log_message(f"🎯 Command heard: '{command}'")

            # Process the command
            self.process_command(command)

        except Exception as e:
            self.log_message(f"❌ Command listening error: {e}")
        finally:
            self.processing = False
            if self.listening:
                self.update_status("🎤 Listening for 'Hey Robot'...", "green")

    def process_command(self, command):
        """Process voice command and control YouTube Kids"""
        command = command.lower().strip()

        # Remove wake word if it's still in the command
        command = re.sub(r"hey robot[s]?", "", command).strip()

        try:
            if not self.driver:
                self.log_message("❌ YouTube Kids not loaded!")
                return

            # Search commands
            if any(word in command for word in ["find", "search", "look for", "show me"]):
                search_term = self.extract_search_term(command)
                if search_term:
                    self.search_youtube_kids(search_term)
                else:
                    self.log_message("❌ No search term found")

            # Playback controls
            elif any(word in command for word in ["play", "start"]) and "list" not in command:
                self.press_play_pause()
                self.log_message("▶️ Playing video")

            elif "pause" in command or "stop" in command:
                self.press_play_pause()
                self.log_message("⏸️ Pausing video")

            # Navigation
            elif "next" in command:
                self.next_video()
                self.log_message("⏭️ Next video")

            elif "previous" in command or "back" in command:
                self.previous_video()
                self.log_message("⏮️ Previous video")

            # Fullscreen
            elif "full screen" in command or "fullscreen" in command:
                self.toggle_fullscreen()
                self.log_message("🔳 Toggling fullscreen")

            # Volume
            elif "volume up" in command or "louder" in command:
                self.volume_up()
                self.log_message("🔊 Volume up")

            elif "volume down" in command or "quieter" in command:
                self.volume_down()
                self.log_message("🔉 Volume down")

            else:
                self.log_message(f"❓ Unknown command: '{command}'")

        except Exception as e:
            self.log_message(f"❌ Error executing command: {e}")

    def extract_search_term(self, command):
        """Extract search term from voice command"""
        # Remove command words
        search_words = ["find", "search", "look for", "show me", "play"]
        clean_command = command

        for word in search_words:
            clean_command = clean_command.replace(word, "")

        # Remove connecting words
        connecting_words = ["for", "me", "some", "a", "the"]
        words = clean_command.split()
        filtered_words = [
            w for w in words if w not in connecting_words and len(w) > 1]

        return " ".join(filtered_words).strip()

    def search_youtube_kids(self, search_term):
        """Search for videos on YouTube Kids"""
        try:
            # Find search box
            search_box = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located(
                    (By.CSS_SELECTOR, "input[aria-label*='Search'], input[placeholder*='Search'], input[type='search']"))
            )

            # Clear and enter search term
            search_box.clear()
            search_box.send_keys(search_term)
            search_box.send_keys(Keys.RETURN)

            self.log_message(f"🔍 Searching for: '{search_term}'")

        except Exception as e:
            self.log_message(f"❌ Search error: {e}")

    def press_play_pause(self):
        """Toggle play/pause"""
        try:
            # Try different selectors for play/pause button
            selectors = [
                "button[aria-label*='Play']",
                "button[aria-label*='Pause']",
                ".ytp-play-button",
                "[role='button'][aria-label*='Play']",
                "[role='button'][aria-label*='Pause']"
            ]

            for selector in selectors:
                try:
                    button = self.driver.find_element(
                        By.CSS_SELECTOR, selector)
                    button.click()
                    return
                except:
                    continue

            # Fallback: press spacebar
            self.driver.find_element(By.TAG_NAME, "body").send_keys(Keys.SPACE)

        except Exception as e:
            self.log_message(f"❌ Play/Pause error: {e}")

    def toggle_fullscreen(self):
        """Toggle fullscreen mode"""
        try:
            # Try fullscreen button
            fullscreen_selectors = [
                "button[aria-label*='Fullscreen']",
                ".ytp-fullscreen-button",
                "[title*='Fullscreen']"
            ]

            for selector in fullscreen_selectors:
                try:
                    button = self.driver.find_element(
                        By.CSS_SELECTOR, selector)
                    button.click()
                    return
                except:
                    continue

            # Fallback: press F key
            self.driver.find_element(By.TAG_NAME, "body").send_keys("f")

        except Exception as e:
            self.log_message(f"❌ Fullscreen error: {e}")

    def next_video(self):
        """Go to next video"""
        try:
            next_selectors = [
                "button[aria-label*='Next']",
                ".ytp-next-button",
                "[title*='Next']"
            ]

            for selector in next_selectors:
                try:
                    button = self.driver.find_element(
                        By.CSS_SELECTOR, selector)
                    button.click()
                    return
                except:
                    continue

            # Fallback: press N key
            self.driver.find_element(By.TAG_NAME, "body").send_keys("n")

        except Exception as e:
            self.log_message(f"❌ Next video error: {e}")

    def previous_video(self):
        """Go to previous video"""
        try:
            prev_selectors = [
                "button[aria-label*='Previous']",
                ".ytp-prev-button",
                "[title*='Previous']"
            ]

            for selector in prev_selectors:
                try:
                    button = self.driver.find_element(
                        By.CSS_SELECTOR, selector)
                    button.click()
                    return
                except:
                    continue

            # Fallback: press P key
            self.driver.find_element(By.TAG_NAME, "body").send_keys("p")

        except Exception as e:
            self.log_message(f"❌ Previous video error: {e}")

    def volume_up(self):
        """Increase volume"""
        try:
            self.driver.find_element(
                By.TAG_NAME, "body").send_keys(Keys.ARROW_UP)
        except Exception as e:
            self.log_message(f"❌ Volume up error: {e}")

    def volume_down(self):
        """Decrease volume"""
        try:
            self.driver.find_element(
                By.TAG_NAME, "body").send_keys(Keys.ARROW_DOWN)
        except Exception as e:
            self.log_message(f"❌ Volume down error: {e}")

    def test_command(self):
        """Test command processing without voice input"""
        test_commands = [
            "find baby shark",
            "search peppa pig",
            "pause video",
            "toggle fullscreen",
            "next video"
        ]

        import random
        test_command = random.choice(test_commands)
        self.log_message(f"🧪 Testing command: '{test_command}'")
        self.process_command(test_command)

    def cleanup(self):
        """Clean up resources"""
        self.listening = False
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass

    def run(self):
        """Start the application"""
        self.log_message("🚀 YouTube Kids Voice Controller started!")
        self.log_message(
            "💡 Click 'Start Listening' and say 'Hey Robot' followed by a command")

        try:
            self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
            self.root.mainloop()
        except KeyboardInterrupt:
            self.cleanup()

    def on_closing(self):
        """Handle application closing"""
        self.log_message("👋 Shutting down...")
        self.cleanup()
        self.root.destroy()


def main():
    """Main function to run the application"""
    print("🤖 YouTube Kids Voice Controller")
    print("=" * 50)
    print("Requirements:")
    print("- pip install openai-whisper pyaudio selenium")
    print("- ChromeDriver installed and in PATH")
    print("- Microphone access")
    print("=" * 50)

    try:
        app = YouTubeKidsVoiceController()
        app.run()
    except Exception as e:
        print(f"❌ Error starting application: {e}")
        input("Press Enter to exit...")


if __name__ == "__main__":
    main()
