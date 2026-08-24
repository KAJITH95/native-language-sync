// Web Speech API Helper for Text-to-Speech and Speech Recognition

export function speakText(text: string, langCode: string = 'en-US'): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis is not supported in this browser.');
      resolve();
      return;
    }

    window.speechSynthesis.cancel(); // Stop any ongoing speech

    if (!text.trim()) {
      resolve();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Map custom/regional codes to standard BCP-47
    let cleanLang = langCode;
    if (cleanLang === 'ta') cleanLang = 'ta-IN';
    else if (cleanLang === 'hi') cleanLang = 'hi-IN';
    else if (cleanLang === 'te') cleanLang = 'te-IN';
    else if (cleanLang === 'ml') cleanLang = 'ml-IN';
    else if (cleanLang === 'kn') cleanLang = 'kn-IN';
    else if (cleanLang === 'ja') cleanLang = 'ja-JP';
    else if (cleanLang === 'fr') cleanLang = 'fr-FR';
    else if (cleanLang === 'de') cleanLang = 'de-DE';
    else if (cleanLang === 'es') cleanLang = 'es-ES';
    else if (cleanLang === 'ar') cleanLang = 'ar-SA';
    else if (cleanLang === 'zh' || cleanLang === 'zh-CN') cleanLang = 'zh-CN';
    else if (cleanLang === 'ko') cleanLang = 'ko-KR';
    else if (cleanLang === 'ru') cleanLang = 'ru-RU';
    else if (cleanLang === 'standard' || !cleanLang) cleanLang = 'en-US';

    utterance.lang = cleanLang;
    utterance.rate = 0.95; // Slightly slower for clarity
    utterance.pitch = 1.0;

    // Try matching an available voice
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(
      (v) => v.lang.toLowerCase() === cleanLang.toLowerCase() || v.lang.startsWith(cleanLang.split('-')[0])
    );
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

export function createSpeechRecognizer(
  onResult: (transcript: string) => void,
  onError: (errorMsg: string) => void,
  onEnd: () => void
) {
  if (!isSpeechRecognitionSupported()) {
    return null;
  }

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'ta-IN'; // Default to Tamil/multilingual if available or browser locale

  recognition.onresult = (event: any) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    if (transcript) {
      onResult(transcript);
    }
  };

  recognition.onerror = (event: any) => {
    onError(event.error || 'Voice recognition error');
  };

  recognition.onend = () => {
    onEnd();
  };

  return recognition;
}
