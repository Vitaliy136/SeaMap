import { createApp } from 'vue'
import './style.css'
import PrimeVue from 'primevue/config';
import App from './App.vue'
import Lara from '@primevue/themes/lara';

import Button from "primevue/button"

import 'primeicons/primeicons.css';

const app = createApp(App);
app.use(PrimeVue, { theme: { preset: Lara } });

app.component('Button', Button);

app.mount('#app');
