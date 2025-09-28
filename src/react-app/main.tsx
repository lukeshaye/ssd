// src/react-app/main.tsx

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/react-app/index.css";
import App from "@/react-app/App.tsx";

// --- IMPORTAÇÕES ESSENCIAIS DO PRIMEREACT ---
import "primereact/resources/themes/lara-light-indigo/theme.css"; // 1. O tema de sua escolha
import "primereact/resources/primereact.min.css";                 // 2. CSS principal dos componentes
import "primeicons/primeicons.css";                               // 3. Ícones (pi pi-check, etc.)

// --- Configuração Global do PrimeReact ---
import { addLocale, locale } from 'primereact/api';

// Configuração completa em Português Brasileiro para o PrimeReact
addLocale('pt-BR', {
    firstDayOfWeek: 0,
    dayNames: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
    dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    dayNamesMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
    monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
    monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    today: 'Hoje',
    clear: 'Limpar',
});

locale('pt-BR');

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);