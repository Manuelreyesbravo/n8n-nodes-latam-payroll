# n8n-nodes-latam-payroll

![LATAM Payroll](https://img.shields.io/badge/LATAM-Payroll-4CAF50)
![n8n](https://img.shields.io/badge/n8n-community--node-ff6d5a)
![Version](https://img.shields.io/badge/version-0.2.0-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

Nodo n8n para **cálculos laborales de Latinoamérica y España** con **datos reales 2024**. 100% gratuito, sin credenciales.

## 🚀 ¿Qué hay de nuevo en v0.2.0?

- ✅ **AFPs/Fondos de pensión REALES** con comisiones exactas
- ✅ **Tablas ISR/IRPF/IR progresivas 2024** para todos los países
- ✅ **Cálculo de días proporcionales** (trabajó 15 de 30 días)
- ✅ **Bonos no imponibles/gravables** configurables
- ✅ **Costo empresa real** con aportes patronales
- ✅ **Cálculo inverso**: "quiero pagar X líquido, ¿cuánto bruto?"

## 🌎 Países Soportados

### 🇨🇱 Chile
| Característica | Detalle |
|----------------|---------|
| **AFPs reales** | Modelo (0.58%), Uno (0.49%), Habitat (1.27%), PlanVital (1.16%), Capital (1.44%), Cuprum (1.44%), ProVida (1.45%) |
| **Topes** | 81.6 UF AFP, 126.6 UF cesantía |
| **Días proporcionales** | Cálculo por días trabajados |
| **Bonos** | Colación, movilización, otros no imponibles |
| **Costo empresa** | Incluye 2.4% cesantía patronal |

### 🇲🇽 México
| Característica | Detalle |
|----------------|---------|
| **ISR 2024** | 11 tramos progresivos (5% - 35%) |
| **Subsidio empleo** | 11 rangos según tabla oficial |
| **UMA 2024** | $108.57 diario / $3,300.14 mensual |
| **Zona frontera** | Salario mínimo diferenciado |
| **Bonos** | Vales despensa (40% UMA exento), transporte |

### 🇦🇷 Argentina
| Característica | Detalle |
|----------------|---------|
| **Ganancias 2024** | 9 tramos progresivos (5% - 35%) |
| **MNI** | $3,091,035 mensual exento |
| **Deducciones** | $78,833 por hijo |
| **Obra social** | Configurable por convenio (default 3%) |
| **Sindicato** | Cuota configurable (default 2%) |

### 🇨🇴 Colombia
| Característica | Detalle |
|----------------|---------|
| **Retención fuente** | 7 tramos según UVT ($47,065) |
| **Auxilio transporte** | $162,000 si salario ≤ 2 SMMLV |
| **Fondo solidaridad** | 1% si salario > 4 SMMLV |
| **SMMLV 2024** | $1,300,000 |
| **Costo empresa** | 12% pensión + 8.5% salud + ARL + parafiscales |

### 🇵🇪 Perú
| Característica | Detalle |
|----------------|---------|
| **AFPs reales** | Habitat (1.47%), Integra (1.55%), Prima (1.60%), Profuturo (1.69%) |
| **ONP** | Sistema público 13% |
| **5ta categoría** | Exento hasta 7 UIT ($36,050) |
| **Asignación familiar** | 10% RMV si tiene hijos |
| **EsSalud** | 9% aporte patronal |

### 🇧🇷 Brasil
| Característica | Detalle |
|----------------|---------|
| **INSS 2024** | 4 faixas progressivas (7.5% - 14%), teto R$908.85 |
| **IRRF 2024** | 5 faixas com deduções |
| **Dependentes** | R$189.59 dedução por dependente |
| **Vale transporte** | Desconto 6% se optar |
| **Custo empresa** | FGTS 8% + encargos ~20% |

### 🇪🇨 Ecuador
| Característica | Detalle |
|----------------|---------|
| **IR 2024** | 10 tramos progresivos |
| **SBU 2024** | $460 |
| **Fondos reserva** | 8.33% mensualizado o acumulado |
| **IESS personal** | 9.45% |
| **IESS patronal** | 11.15% |

### 🇪🇸 España
| Característica | Detalle |
|----------------|---------|
| **IRPF 2024** | 6 tramos progresivos (19% - 47%) |
| **Bases SS** | Mínima €1,323 / Máxima €4,720.50 |
| **Pagas** | 12 o 14 pagas configurables |
| **Mínimo familiar** | Reducción por hijos |
| **SMI 2024** | €1,134/mes (14 pagas) |

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

### Calcular sueldo líquido Chile (con AFP real)
```
País: Chile
Operación: Sueldo Líquido
Sueldo Bruto: 1.500.000
AFP: AFP Modelo (10.58%)
Días trabajados: 22 de 30
Bono colación: 50.000
→ Resultado: Líquido proporcional + bonos
```

### Calcular bruto desde líquido deseado (México)
```
País: México
Operación: Bruto desde Líquido
Líquido deseado: 20.000
Zona frontera: No
→ Resultado: Bruto necesario + ISR real + costo empresa
```

### Calcular nómina Brasil con beneficios
```
País: Brasil
Operación: Sueldo Líquido
Salário Bruto: 5.000
Dependentes: 2
Vale Transporte: Sim
Vale Refeição: 500
→ Resultado: Líquido + INSS + IRRF con deducciones
```

## ✅ Características

- **Sin credenciales**: Cálculos matemáticos puros
- **Datos 2024**: Tablas y valores actualizados
- **Precisión real**: AFPs, ISR, INSS con valores exactos
- **Bidireccional**: Bruto→Líquido y Líquido→Bruto
- **Costo empresa**: Calcula el costo total para el empleador
- **100% gratuito**: Open source MIT

## ⚠️ Disclaimer

Los cálculos son referenciales basados en la legislación vigente 2024. Para casos específicos, consulte con un profesional de recursos humanos o contador.

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor abre un issue o pull request.

## 📄 Licencia

MIT © Manuel Reyes Bravo

## 📝 Changelog

### v0.2.0 (2024-12)
- 🇨🇱 Chile: 7 AFPs reales con comisiones exactas
- 🇲🇽 México: ISR 2024 + subsidio empleo
- 🇦🇷 Argentina: Impuesto Ganancias + deducciones
- 🇨🇴 Colombia: Retención fuente + UVT
- 🇵🇪 Perú: 4 AFPs + ONP + 5ta categoría
- 🇧🇷 Brasil: INSS/IRRF progressivos + dependentes
- 🇪🇨 Ecuador: IR + fondos reserva
- 🇪🇸 España: IRPF progresivo + 12/14 pagas
- ✨ Días proporcionales en todos los países
- ✨ Bonos configurables
- ✨ Costo empresa real

### v0.1.1 (2024-12)
- Agregado cálculo inverso (Bruto desde Líquido)

### v0.1.0 (2024-12)
- Versión inicial con 8 países
