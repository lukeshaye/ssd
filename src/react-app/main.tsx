import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/react-app/index.css";
import App from "@/react-app/App.tsx";

// --- Configuração Global do PrimeReact ---
// A configuração do PrimeReact está correta e deve ser mantida aqui.
import { addLocale, locale } from 'primereact/api';

// Configuração completa em Português Brasileiro para o PrimeReact
addLocale('pt-BR', {
    firstDayOfWeek: 0, // Domingo = 0
    dayNames: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
    dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    dayNamesMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
    monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
    monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    today: 'Hoje',
    clear: 'Limpar',
    // ...outras traduções que você possa ter
});

// Define pt-BR como o locale padrão globalmente para o PrimeReact
locale('pt-BR');

// A renderização do aplicativo permanece a mesma
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);