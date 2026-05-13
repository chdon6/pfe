import {
  Component,
  OnInit,
  inject,
  signal,
  ElementRef,
  ViewChild,
  AfterViewChecked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { ChatbotService, ChatbotSourceChunk } from '../../core/services/chatbot.service';

export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  sources?: ChatbotSourceChunk[];
  timestamp: Date;
}

@Component({
  standalone: true,
  imports: [FormsModule, SlicePipe],
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.scss',
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesEnd') private messagesEnd!: ElementRef<HTMLDivElement>;

  private readonly chatbot = inject(ChatbotService);

  messages = signal<ChatMessage[]>([]);
  userInput = signal('');
  loading = signal(false);
  engineStatus = signal<'ok' | 'error' | 'checking'>('checking');

  private shouldScroll = false;

  ngOnInit(): void {
    this.checkHealth();
    this.messages.set([
      {
        role: 'bot',
        text: "Bonjour ! Je suis l'assistant PMA. Posez-moi vos questions sur les dossiers patients, cycles, protocoles ou actes enregistrés dans le système.",
        timestamp: new Date(),
      },
    ]);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  send(): void {
    const msg = this.userInput().trim();
    if (!msg || this.loading()) return;

    this.addMessage({ role: 'user', text: msg, timestamp: new Date() });
    this.userInput.set('');
    this.loading.set(true);

    this.chatbot.chat(msg).subscribe({
      next: (res) => {
        this.addMessage({
          role: 'bot',
          text: res.answer,
          sources: res.sources?.length ? res.sources : undefined,
          timestamp: new Date(),
        });
        this.loading.set(false);
      },
      error: (err) => {
        const detail =
          err?.error?.error ??
          "Le service est temporairement indisponible. Vérifiez que le serveur chatbot Python est lancé.";
        this.addMessage({
          role: 'bot',
          text: `Erreur : ${detail}`,
          timestamp: new Date(),
        });
        this.loading.set(false);
      },
    });
  }

  clearHistory(): void {
    this.messages.set([
      {
        role: 'bot',
        text: "Historique effacé. Posez une nouvelle question.",
        timestamp: new Date(),
      },
    ]);
  }

  private addMessage(m: ChatMessage): void {
    this.messages.update((prev) => [...prev, m]);
    this.shouldScroll = true;
  }

  private scrollToBottom(): void {
    this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
  }

  private checkHealth(): void {
    this.engineStatus.set('checking');
    this.chatbot.health().subscribe({
      next: () => this.engineStatus.set('ok'),
      error: () => this.engineStatus.set('error'),
    });
  }

  formatTime(d: Date): string {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}
