import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  ElementRef,
  ViewChild,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService, type ChatHistoryItem } from '../../../core/services/chatbot.service';
import { GrokChatWidgetService } from '../../../core/services/grok-chat-widget.service';

export interface ChatMsg {
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
  loading?: boolean;
}

@Component({
  selector: 'app-grok-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './grok-chat-widget.component.html',
  styleUrl: './grok-chat-widget.component.scss',
})
export class GrokChatWidgetComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('msgEnd') private msgEnd!: ElementRef<HTMLDivElement>;

  readonly widgetSvc  = inject(GrokChatWidgetService);
  private chatbot     = inject(ChatbotService);

  messages   = signal<ChatMsg[]>([]);
  userInput  = signal('');
  busy       = signal(false);
  engineOk   = signal<'ok' | 'error' | 'checking'>('checking');
  private needsScroll = false;

  constructor() {}

  ngOnInit(): void {
    this.checkHealth();
    this.pushBot(
      "Bonjour\u00a0! Je suis votre assistant PMA (Groq\u00a0/ Llama\u00a03.3).\n\n" +
      "Je connais toutes les donn\u00e9es r\u00e9elles du syst\u00e8me. Vous pouvez me demander\u00a0:\n" +
      "\u2022 R\u00e9sum\u00e9 du dossier d\u2019un patient\n" +
      "\u2022 Ses rendez-vous et cycles PMA\n" +
      "\u2022 L\u2019emplacement de ses \u00e9l\u00e9ments biologiques (bonbonne, canister, position)\n" +
      "\u2022 Toute information enregistr\u00e9e dans le syst\u00e8me"
    );
  }

  ngOnDestroy(): void {}

  ngAfterViewChecked(): void {
    if (this.needsScroll) {
      this.scrollBottom();
      this.needsScroll = false;
    }
  }

  send(): void {
    const msg = this.userInput().trim();
    if (!msg || this.busy()) return;
    this.pushUser(msg);
    this.userInput.set('');
    this.callApi(msg);
  }

  clearHistory(): void {
    this.messages.set([]);
    this.pushBot('Historique effac\u00e9. Posez une nouvelle question.');
  }

  private callApi(message: string): void {
    this.busy.set(true);
    const history: ChatHistoryItem[] = this.messages()
      .filter(m => !m.loading)
      .slice(-10)
      .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));

    this.chatbot.chat(message, history).subscribe({
      next: (res) => {
        this.pushBot(res.answer);
        this.busy.set(false);
      },
      error: (err) => {
        const detail = err?.error?.error ?? "Service temporairement indisponible.";
        this.pushBot(`Erreur\u00a0: ${detail}`);
        this.busy.set(false);
      },
    });
  }

  private pushUser(text: string): void {
    this.messages.update(m => [...m, { role: 'user', text, timestamp: new Date() }]);
    this.needsScroll = true;
  }

  private pushBot(text: string): void {
    this.messages.update(m => [...m, { role: 'bot', text, timestamp: new Date() }]);
    this.needsScroll = true;
  }

  private scrollBottom(): void {
    this.msgEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
  }

  private checkHealth(): void {
    this.chatbot.health().subscribe({
      next:  () => this.engineOk.set('ok'),
      error: () => this.engineOk.set('error'),
    });
  }

  fmtTime(d: Date): string {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

}
