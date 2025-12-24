# n8n-nodes-latam-payroll

![LATAM Payroll](https://img.shields.io/badge/LATAM-Payroll-4CAF50)
![n8n](https://img.shields.io/badge/n8n-community--node-ff6d5a)
![License](https://img.shields.io/badge/license-MIT-blue)

Nodo n8n para **cálculos laborales de Latinoamérica y España**. 100% gratuito, sin credenciales.

## 🚀 Funcionalidades

### 🇨🇱 Chile
| Cálculo | Detalle |
|---------|---------|
| **Vacaciones** | 15 días hábiles por año |
| **Aguinaldo** | Septiembre y Diciembre |
| **Descuentos** | AFP 10%, Salud 7%, Cesantía 0.6% |
| **Finiquito** | Indemnización 1 mes x año (tope 11) |
| **Sueldo líquido** | Bruto - descuentos legales |

### 🇲🇽 México
| Cálculo | Detalle |
|---------|---------|
| **Vacaciones** | 12 días (aumenta con antigüedad) |
| **Prima vacacional** | 25% sobre días de vacaciones |
| **Aguinaldo** | 15 días de salario |
| **Descuentos** | IMSS, ISR según tabla |
| **Finiquito** | 3 meses + 20 días x año |

### 🇦🇷 Argentina
| Cálculo | Detalle |
|---------|---------|
| **Vacaciones** | 14-35 días según antigüedad |
| **SAC (Aguinaldo)** | Medio sueldo por semestre |
| **Descuentos** | Jubilación 11%, Obra Social 3%, Ley 19032 3% |
| **Indemnización** | 1 mes x año trabajado |

### 🇨🇴 Colombia
| Cálculo | Detalle |
|---------|---------|
| **Vacaciones** | 15 días hábiles por año |
| **Prima de servicios** | 1 sueldo al año (Jun/Dic) |
| **Cesantías** | 1 mes por año |
| **Descuentos** | Pensión 4%, Salud 4% |

### 🇵🇪 Perú
| Cálculo | Detalle |
|---------|---------|
| **Vacaciones** | 30 días calendario |
| **Gratificación** | 1 sueldo Jul + 1 sueldo Dic |
| **CTS** | 1.17 sueldos por año |
| **Descuentos** | AFP ~10%, Salud (EsSalud empleador) |

### 🇧🇷 Brasil
| Cálculo | Detalle |
|---------|---------|
| **Férias** | 30 días + 1/3 constitucional |
| **13° salário** | 1 sueldo al año |
| **FGTS** | 8% (empleador) |
| **Descuentos** | INSS 7.5-14%, IRRF según tabla |
| **Rescisão** | 40% FGTS + aviso prévio |

### 🇪🇨 Ecuador
| Cálculo | Detalle |
|---------|---------|
| **Vacaciones** | 15 días por año |
| **Décimo tercero** | 1 sueldo (Navidad) |
| **Décimo cuarto** | 1 SBU ($460 en 2025) |
| **Descuentos** | IESS 9.45% |
| **Desahucio** | 25% del último sueldo x año |

### 🇪🇸 España
| Cálculo | Detalle |
|---------|---------|
| **Vacaciones** | 30 días naturales (22 hábiles) |
| **Pagas extras** | 2 pagas al año |
| **Descuentos** | SS 6.35%, Desempleo 1.55%, IRPF variable |
| **Finiquito** | 33 días x año (tope 24 mensualidades) |

## 📦 Instalación

### En n8n (recomendado)
1. Ve a **Settings** → **Community Nodes**
2. Clic en **Install**
3. Escribe: `n8n-nodes-latam-payroll`
4. Clic en **Install**

### Via npm
```bash
npm install n8n-nodes-latam-payroll
```

## 📋 Ejemplos de Uso

### Calcular sueldo líquido Chile
```
País: Chile
Operación: Sueldo Líquido
Sueldo Bruto: 1.500.000
AFP: Modelo (10.77%)
Salud: Fonasa (7%)
→ Resultado: Líquido, detalles de descuentos
```

### Calcular finiquito México
```
País: México
Operación: Finiquito
Sueldo mensual: 25.000
Años trabajados: 5
Días pendientes vacaciones: 8
→ Resultado: Total liquidación con desglose
```

### Calcular aguinaldo Argentina
```
País: Argentina
Operación: SAC (Aguinaldo)
Mejor sueldo semestre: 850.000
Meses trabajados: 6
→ Resultado: SAC completo o proporcional
```

## ✅ Sin credenciales

Este nodo **NO requiere credenciales** porque:
- Son cálculos matemáticos puros
- Usa legislación laboral vigente
- Funciona 100% offline
- 100% gratuito

## ⚠️ Disclaimer

Los cálculos son referenciales basados en la legislación vigente. Para casos específicos, consulte con un profesional de recursos humanos o contador.

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor abre un issue o pull request.

## 📄 Licencia

MIT © Manuel Reyes Bravo
