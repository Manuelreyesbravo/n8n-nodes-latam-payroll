import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

// ==================== CHILE - AFPs REALES 2024 ====================
const CHILE_AFPS: { [key: string]: { nombre: string; cotizacion: number; sis: number; comision: number } } = {
	'capital': { nombre: 'AFP Capital', cotizacion: 10, sis: 1.49, comision: 1.44 }, // Total: 11.44%
	'cuprum': { nombre: 'AFP Cuprum', cotizacion: 10, sis: 1.49, comision: 1.44 }, // Total: 11.44%
	'habitat': { nombre: 'AFP Habitat', cotizacion: 10, sis: 1.49, comision: 1.27 }, // Total: 11.27%
	'modelo': { nombre: 'AFP Modelo', cotizacion: 10, sis: 1.49, comision: 0.58 }, // Total: 10.58%
	'planvital': { nombre: 'AFP PlanVital', cotizacion: 10, sis: 1.49, comision: 1.16 }, // Total: 11.16%
	'provida': { nombre: 'AFP ProVida', cotizacion: 10, sis: 1.49, comision: 1.45 }, // Total: 11.45%
	'uno': { nombre: 'AFP Uno', cotizacion: 10, sis: 1.49, comision: 0.49 }, // Total: 10.49%
};

// Topes imponibles Chile 2024
const CHILE_UF = 37000; // Valor aproximado UF
const CHILE_TOPE_IMPONIBLE = 81.6 * CHILE_UF; // 81.6 UF
const CHILE_TOPE_SEGURO_CESANTIA = 126.6 * CHILE_UF; // 126.6 UF

function chileCalcularSueldoLiquido(
	bruto: number,
	afpKey: string = 'modelo',
	saludPct: number = 7,
	cesantiaPct: number = 0.6,
	diasMes: number = 30,
	diasTrabajados: number = 30,
	bonoColacion: number = 0,
	bonoMovilizacion: number = 0,
	otrosBonos: number = 0
): object {
	// Proporcional por días trabajados
	const brutoBase = bruto;
	const brutoProporcional = Math.round(bruto * diasTrabajados / diasMes);
	
	// AFP real
	const afp = CHILE_AFPS[afpKey] || CHILE_AFPS['modelo'];
	const afpTotal = afp.cotizacion + afp.sis + afp.comision;
	
	// Base imponible (con tope)
	const baseImponible = Math.min(brutoProporcional, CHILE_TOPE_IMPONIBLE);
	
	// Descuentos
	const descuentoAfp = Math.round(baseImponible * afpTotal / 100);
	const descuentoSalud = Math.round(baseImponible * saludPct / 100);
	const descuentoCesantia = Math.round(Math.min(brutoProporcional, CHILE_TOPE_SEGURO_CESANTIA) * cesantiaPct / 100);
	const totalDescuentos = descuentoAfp + descuentoSalud + descuentoCesantia;
	
	// Bonos no imponibles
	const totalBonos = bonoColacion + bonoMovilizacion + otrosBonos;
	
	// Líquido final
	const liquido = brutoProporcional - totalDescuentos + totalBonos;
	
	return {
		pais: 'Chile',
		sueldoBrutoBase: brutoBase,
		diasMes,
		diasTrabajados,
		sueldoBrutoProporcional: brutoProporcional,
		afp: {
			nombre: afp.nombre,
			cotizacionObligatoria: afp.cotizacion,
			sis: afp.sis,
			comision: afp.comision,
			totalPorcentaje: afpTotal,
			monto: descuentoAfp,
		},
		descuentos: {
			afp: descuentoAfp,
			salud: { porcentaje: saludPct, monto: descuentoSalud },
			cesantia: { porcentaje: cesantiaPct, monto: descuentoCesantia },
			total: totalDescuentos,
		},
		bonos: {
			colacion: bonoColacion,
			movilizacion: bonoMovilizacion,
			otros: otrosBonos,
			total: totalBonos,
			nota: 'Bonos no imponibles',
		},
		sueldoLiquido: liquido,
	};
}

function chileCalcularBrutoDesdeLiquido(
	liquidoDeseado: number,
	afpKey: string = 'modelo',
	saludPct: number = 7,
	cesantiaPct: number = 0.6,
	diasMes: number = 30,
	diasTrabajados: number = 30,
	bonoColacion: number = 0,
	bonoMovilizacion: number = 0,
	otrosBonos: number = 0
): object {
	// AFP real
	const afp = CHILE_AFPS[afpKey] || CHILE_AFPS['modelo'];
	const afpTotal = afp.cotizacion + afp.sis + afp.comision;
	
	// Bonos no imponibles
	const totalBonos = bonoColacion + bonoMovilizacion + otrosBonos;
	
	// Líquido sin bonos (lo que debe venir del bruto)
	const liquidoSinBonos = liquidoDeseado - totalBonos;
	
	// Fórmula inversa considerando proporción de días
	const totalDescuentosPct = (afpTotal + saludPct + cesantiaPct) / 100;
	const brutoProporcional = Math.round(liquidoSinBonos / (1 - totalDescuentosPct));
	
	// Bruto base (si trabajara mes completo)
	const brutoBase = Math.round(brutoProporcional * diasMes / diasTrabajados);
	
	// Calcular descuentos reales
	const descuentoAfp = Math.round(brutoProporcional * afpTotal / 100);
	const descuentoSalud = Math.round(brutoProporcional * saludPct / 100);
	const descuentoCesantia = Math.round(brutoProporcional * cesantiaPct / 100);
	const totalDescuentos = descuentoAfp + descuentoSalud + descuentoCesantia;
	
	// Líquido resultante
	const liquidoResultante = brutoProporcional - totalDescuentos + totalBonos;
	
	// Costo empresa (incluye aporte patronal cesantía 2.4%)
	const aportePatronalCesantia = Math.round(brutoProporcional * 2.4 / 100);
	const costoEmpresa = brutoProporcional + aportePatronalCesantia + totalBonos;
	
	return {
		pais: 'Chile',
		liquidoDeseado,
		diasMes,
		diasTrabajados,
		sueldoBrutoBase: brutoBase,
		sueldoBrutoProporcional: brutoProporcional,
		afp: {
			nombre: afp.nombre,
			cotizacionObligatoria: afp.cotizacion,
			sis: afp.sis,
			comision: afp.comision,
			totalPorcentaje: afpTotal,
			monto: descuentoAfp,
		},
		descuentos: {
			afp: descuentoAfp,
			salud: { porcentaje: saludPct, monto: descuentoSalud },
			cesantia: { porcentaje: cesantiaPct, monto: descuentoCesantia },
			total: totalDescuentos,
		},
		bonos: {
			colacion: bonoColacion,
			movilizacion: bonoMovilizacion,
			otros: otrosBonos,
			total: totalBonos,
		},
		liquidoResultante,
		costoEmpresa: {
			bruto: brutoProporcional,
			aportePatronalCesantia: aportePatronalCesantia,
			bonos: totalBonos,
			total: costoEmpresa,
			nota: 'Incluye 2.4% aporte patronal seguro cesantía',
		},
	};
}

function chileCalcularVacaciones(sueldoBruto: number, diasPendientes: number): object {
	const sueldoDiario = sueldoBruto / 30;
	const montoVacaciones = Math.round(sueldoDiario * diasPendientes);
	
	return {
		pais: 'Chile',
		diasLegales: 15,
		diasPendientes,
		sueldoDiario: Math.round(sueldoDiario),
		montoVacaciones,
		nota: '15 días hábiles por año trabajado',
	};
}

function chileCalcularFiniquito(sueldoBruto: number, anosAntiguedad: number, diasVacacionesPendientes: number, mesTrabajado: number): object {
	const sueldoDiario = sueldoBruto / 30;
	
	// Indemnización años de servicio (tope 11 años)
	const anosIndemnizacion = Math.min(anosAntiguedad, 11);
	const indemnizacion = sueldoBruto * anosIndemnizacion;
	
	// Mes de aviso (si no se dio aviso previo)
	const mesAviso = sueldoBruto;
	
	// Vacaciones proporcionales
	const vacacionesProporcionales = Math.round(sueldoDiario * diasVacacionesPendientes);
	
	// Sueldo proporcional del mes
	const sueldoProporcional = Math.round(sueldoDiario * mesTrabajado);
	
	const totalFiniquito = indemnizacion + mesAviso + vacacionesProporcionales + sueldoProporcional;
	
	return {
		pais: 'Chile',
		desglose: {
			indemnizacionAnosServicio: { anos: anosIndemnizacion, monto: indemnizacion },
			mesAviso: mesAviso,
			vacacionesPendientes: { dias: diasVacacionesPendientes, monto: vacacionesProporcionales },
			sueldoProporcional: { dias: mesTrabajado, monto: sueldoProporcional },
		},
		totalFiniquito,
		nota: 'Indemnización tope 11 años. No incluye gratificación.',
	};
}

// ==================== MEXICO - ISR Y CUOTAS REALES 2024 ====================
// UMA 2024: $108.57 diario
const MEXICO_UMA_DIARIO = 108.57;
const MEXICO_UMA_MENSUAL = MEXICO_UMA_DIARIO * 30.4;

// Salario Mínimo 2024
const MEXICO_SALARIO_MINIMO_GENERAL = 248.93; // Zona general
const MEXICO_SALARIO_MINIMO_FRONTERA = 374.89; // Zona frontera norte

// Tabla ISR Mensual 2024
const MEXICO_ISR_TABLA = [
	{ limiteInferior: 0, limiteSuperior: 746.04, cuotaFija: 0, tasaExcedente: 1.92 },
	{ limiteInferior: 746.05, limiteSuperior: 6332.05, cuotaFija: 14.32, tasaExcedente: 6.40 },
	{ limiteInferior: 6332.06, limiteSuperior: 11128.01, cuotaFija: 371.83, tasaExcedente: 10.88 },
	{ limiteInferior: 11128.02, limiteSuperior: 12935.82, cuotaFija: 893.63, tasaExcedente: 16.00 },
	{ limiteInferior: 12935.83, limiteSuperior: 15487.71, cuotaFija: 1182.88, tasaExcedente: 17.92 },
	{ limiteInferior: 15487.72, limiteSuperior: 31236.49, cuotaFija: 1640.18, tasaExcedente: 21.36 },
	{ limiteInferior: 31236.50, limiteSuperior: 49233.00, cuotaFija: 5004.12, tasaExcedente: 23.52 },
	{ limiteInferior: 49233.01, limiteSuperior: 93993.90, cuotaFija: 9236.89, tasaExcedente: 30.00 },
	{ limiteInferior: 93993.91, limiteSuperior: 125325.20, cuotaFija: 22665.17, tasaExcedente: 32.00 },
	{ limiteInferior: 125325.21, limiteSuperior: 375975.61, cuotaFija: 32691.18, tasaExcedente: 34.00 },
	{ limiteInferior: 375975.62, limiteSuperior: Infinity, cuotaFija: 117912.32, tasaExcedente: 35.00 },
];

// Subsidio al empleo mensual 2024
const MEXICO_SUBSIDIO_TABLA = [
	{ desde: 0, hasta: 1768.96, subsidio: 407.02 },
	{ desde: 1768.97, hasta: 2653.38, subsidio: 406.83 },
	{ desde: 2653.39, hasta: 3472.84, subsidio: 406.62 },
	{ desde: 3472.85, hasta: 3537.87, subsidio: 392.77 },
	{ desde: 3537.88, hasta: 4446.15, subsidio: 382.46 },
	{ desde: 4446.16, hasta: 4717.18, subsidio: 354.23 },
	{ desde: 4717.19, hasta: 5335.42, subsidio: 324.87 },
	{ desde: 5335.43, hasta: 6224.67, subsidio: 294.63 },
	{ desde: 6224.68, hasta: 7113.90, subsidio: 253.54 },
	{ desde: 7113.91, hasta: 7382.33, subsidio: 217.61 },
	{ desde: 7382.34, hasta: Infinity, subsidio: 0 },
];

function mexicoCalcularISR(baseGravable: number): { isr: number; subsidio: number; isrNeto: number } {
	// Buscar rango en tabla ISR
	let isr = 0;
	for (const rango of MEXICO_ISR_TABLA) {
		if (baseGravable >= rango.limiteInferior && baseGravable <= rango.limiteSuperior) {
			const excedente = baseGravable - rango.limiteInferior;
			isr = rango.cuotaFija + (excedente * rango.tasaExcedente / 100);
			break;
		}
	}
	
	// Buscar subsidio al empleo
	let subsidio = 0;
	for (const rango of MEXICO_SUBSIDIO_TABLA) {
		if (baseGravable >= rango.desde && baseGravable <= rango.hasta) {
			subsidio = rango.subsidio;
			break;
		}
	}
	
	const isrNeto = Math.max(0, isr - subsidio);
	return { isr: Math.round(isr), subsidio: Math.round(subsidio), isrNeto: Math.round(isrNeto) };
}

function mexicoCalcularSueldoLiquido(
	bruto: number,
	zonaFrontera: boolean = false,
	diasMes: number = 30,
	diasTrabajados: number = 30,
	valesDespensa: number = 0,
	ayudaTransporte: number = 0,
	otrosBonos: number = 0
): object {
	// Proporcional por días trabajados
	const brutoBase = bruto;
	const brutoProporcional = Math.round(bruto * diasTrabajados / diasMes);
	
	// IMSS trabajador (aproximado 2.775% del SBC)
	const imssEmpleado = Math.round(brutoProporcional * 2.775 / 100);
	
	// Base gravable para ISR
	const baseGravable = brutoProporcional - imssEmpleado;
	
	// ISR con subsidio
	const { isr, subsidio, isrNeto } = mexicoCalcularISR(baseGravable);
	
	// Bonos no gravables (tienen límites)
	const limiteValesDespensa = MEXICO_UMA_MENSUAL * 0.4; // 40% UMA
	const valesExentos = Math.min(valesDespensa, limiteValesDespensa);
	const totalBonos = valesExentos + ayudaTransporte + otrosBonos;
	
	// Descuentos totales
	const totalDescuentos = imssEmpleado + isrNeto;
	
	// Líquido final
	const liquido = brutoProporcional - totalDescuentos + totalBonos;
	
	return {
		pais: 'México',
		zona: zonaFrontera ? 'Frontera Norte' : 'General',
		sueldoBrutoBase: brutoBase,
		diasMes,
		diasTrabajados,
		sueldoBrutoProporcional: brutoProporcional,
		descuentos: {
			imss: { porcentaje: 2.775, monto: imssEmpleado },
			isr: {
				baseGravable,
				isrTabla: isr,
				subsidioEmpleo: subsidio,
				isrNeto,
			},
			total: totalDescuentos,
		},
		bonos: {
			valesDespensa: { monto: valesDespensa, exento: valesExentos, limite: Math.round(limiteValesDespensa) },
			ayudaTransporte,
			otros: otrosBonos,
			total: totalBonos,
		},
		sueldoLiquido: liquido,
	};
}

function mexicoCalcularBrutoDesdeLiquido(
	liquidoDeseado: number,
	zonaFrontera: boolean = false,
	diasMes: number = 30,
	diasTrabajados: number = 30,
	valesDespensa: number = 0,
	ayudaTransporte: number = 0,
	otrosBonos: number = 0
): object {
	// Bonos no gravables
	const limiteValesDespensa = MEXICO_UMA_MENSUAL * 0.4;
	const valesExentos = Math.min(valesDespensa, limiteValesDespensa);
	const totalBonos = valesExentos + ayudaTransporte + otrosBonos;
	
	// Líquido sin bonos
	const liquidoSinBonos = liquidoDeseado - totalBonos;
	
	// Aproximación iterativa
	let bruto = liquidoSinBonos * 1.20;
	for (let i = 0; i < 15; i++) {
		const resultado = mexicoCalcularSueldoLiquido(bruto, zonaFrontera, diasMes, diasTrabajados, 0, 0, 0) as any;
		const diferencia = liquidoSinBonos - (resultado.sueldoLiquido);
		bruto = bruto + diferencia;
	}
	const brutoProporcional = Math.round(bruto);
	
	// Bruto base (mes completo)
	const brutoBase = Math.round(brutoProporcional * diasMes / diasTrabajados);
	
	// Calcular resultado final
	const final = mexicoCalcularSueldoLiquido(brutoProporcional, zonaFrontera, diasMes, diasTrabajados, valesDespensa, ayudaTransporte, otrosBonos) as any;
	
	// Costo empresa (IMSS patronal ~25-30% aprox)
	const imssPatronal = Math.round(brutoProporcional * 0.25);
	const costoEmpresa = brutoProporcional + imssPatronal + totalBonos;
	
	return {
		pais: 'México',
		zona: zonaFrontera ? 'Frontera Norte' : 'General',
		liquidoDeseado,
		diasMes,
		diasTrabajados,
		sueldoBrutoBase: brutoBase,
		sueldoBrutoProporcional: brutoProporcional,
		descuentos: final.descuentos,
		bonos: final.bonos,
		liquidoResultante: final.sueldoLiquido,
		costoEmpresa: {
			bruto: brutoProporcional,
			imssPatronal: imssPatronal,
			bonos: totalBonos,
			total: costoEmpresa,
			nota: 'IMSS patronal aprox 25% (varía según riesgo de trabajo)',
		},
	};
}

function mexicoCalcularVacaciones(sueldoMensual: number, anosAntiguedad: number): object {
	// Días de vacaciones según antigüedad (Ley 2023)
	let diasVacaciones = 12;
	if (anosAntiguedad >= 2) diasVacaciones = 14;
	if (anosAntiguedad >= 3) diasVacaciones = 16;
	if (anosAntiguedad >= 4) diasVacaciones = 18;
	if (anosAntiguedad >= 5) diasVacaciones = 20;
	if (anosAntiguedad >= 6) diasVacaciones = 22;
	if (anosAntiguedad >= 11) diasVacaciones = 24;
	if (anosAntiguedad >= 16) diasVacaciones = 26;
	if (anosAntiguedad >= 21) diasVacaciones = 28;
	if (anosAntiguedad >= 26) diasVacaciones = 30;
	if (anosAntiguedad >= 31) diasVacaciones = 32;
	
	const sueldoDiario = sueldoMensual / 30;
	const primaVacacional = Math.round(sueldoDiario * diasVacaciones * 0.25);
	const montoVacaciones = Math.round(sueldoDiario * diasVacaciones);
	
	return {
		pais: 'México',
		anosAntiguedad,
		diasVacaciones,
		sueldoDiario: Math.round(sueldoDiario),
		montoVacaciones,
		primaVacacional25: primaVacacional,
		totalConPrima: montoVacaciones + primaVacacional,
	};
}

function mexicoCalcularAguinaldo(sueldoMensual: number, mesesTrabajados: number = 12): object {
	const sueldoDiario = sueldoMensual / 30;
	const diasAguinaldo = 15; // Mínimo legal
	const aguinaldoCompleto = Math.round(sueldoDiario * diasAguinaldo);
	const aguinaldoProporcional = Math.round(aguinaldoCompleto * mesesTrabajados / 12);
	
	return {
		pais: 'México',
		diasAguinaldo,
		sueldoDiario: Math.round(sueldoDiario),
		aguinaldoCompleto,
		mesesTrabajados,
		aguinaldoProporcional,
		nota: '15 días mínimo legal. Pago antes del 20 de diciembre.',
	};
}

function mexicoCalcularFiniquito(sueldoMensual: number, anosAntiguedad: number, diasVacacionesPendientes: number): object {
	const sueldoDiario = sueldoMensual / 30;
	
	// 3 meses de salario constitucional
	const tresMesesConstitucional = sueldoMensual * 3;
	
	// 20 días por año
	const veinteDiasPorAno = Math.round(sueldoDiario * 20 * anosAntiguedad);
	
	// Prima de antigüedad (12 días por año, tope 2 salarios mínimos)
	const primaAntiguedad = Math.round(sueldoDiario * 12 * anosAntiguedad);
	
	// Vacaciones y prima vacacional
	const vacaciones = Math.round(sueldoDiario * diasVacacionesPendientes);
	const primaVacacional = Math.round(vacaciones * 0.25);
	
	// Aguinaldo proporcional
	const aguinaldoProporcional = Math.round(sueldoDiario * 15 * (new Date().getMonth() + 1) / 12);
	
	const total = tresMesesConstitucional + veinteDiasPorAno + primaAntiguedad + vacaciones + primaVacacional + aguinaldoProporcional;
	
	return {
		pais: 'México',
		desglose: {
			tresMesesConstitucional,
			veinteDiasPorAno: { anos: anosAntiguedad, monto: veinteDiasPorAno },
			primaAntiguedad,
			vacaciones: { dias: diasVacacionesPendientes, monto: vacaciones },
			primaVacacional,
			aguinaldoProporcional,
		},
		totalFiniquito: total,
	};
}

// ==================== ARGENTINA - DESCUENTOS REALES 2024 ====================
// SMVM (Salario Mínimo Vital y Móvil) Diciembre 2024
const ARGENTINA_SMVM = 271571.22;

// Mínimo No Imponible Ganancias 2024 (mensual)
const ARGENTINA_MNI = 3091035; // Aproximado mensual

// Tabla Impuesto a las Ganancias 2024 (mensual)
const ARGENTINA_GANANCIAS_TABLA = [
	{ desde: 0, hasta: 419253.95, fijo: 0, porcentaje: 5 },
	{ desde: 419253.95, hasta: 838507.92, fijo: 20962.70, porcentaje: 9 },
	{ desde: 838507.92, hasta: 1257761.87, fijo: 58695.56, porcentaje: 12 },
	{ desde: 1257761.87, hasta: 1677015.83, fijo: 109006.03, porcentaje: 15 },
	{ desde: 1677015.83, hasta: 2515523.75, fijo: 171894.02, porcentaje: 19 },
	{ desde: 2515523.75, hasta: 3354031.66, fijo: 331210.53, porcentaje: 23 },
	{ desde: 3354031.66, hasta: 5031047.50, fijo: 524067.35, porcentaje: 27 },
	{ desde: 5031047.50, hasta: 6708063.33, fijo: 976861.62, porcentaje: 31 },
	{ desde: 6708063.33, hasta: Infinity, fijo: 1496736.53, porcentaje: 35 },
];

function argentinaCalcularGanancias(baseImponible: number): number {
	if (baseImponible <= 0) return 0;
	
	for (const tramo of ARGENTINA_GANANCIAS_TABLA) {
		if (baseImponible > tramo.desde && baseImponible <= tramo.hasta) {
			const excedente = baseImponible - tramo.desde;
			return Math.round(tramo.fijo + (excedente * tramo.porcentaje / 100));
		}
	}
	// Último tramo
	const ultimo = ARGENTINA_GANANCIAS_TABLA[ARGENTINA_GANANCIAS_TABLA.length - 1];
	const excedente = baseImponible - ultimo.desde;
	return Math.round(ultimo.fijo + (excedente * ultimo.porcentaje / 100));
}

function argentinaCalcularSueldoLiquido(
	bruto: number,
	obraSocialPct: number = 3,
	sindicatoPct: number = 2,
	diasMes: number = 30,
	diasTrabajados: number = 30,
	bonoNoRemunerativo: number = 0,
	tieneHijos: boolean = false,
	cantidadHijos: number = 0
): object {
	// Proporcional por días trabajados
	const brutoBase = bruto;
	const brutoProporcional = Math.round(bruto * diasTrabajados / diasMes);
	
	// Descuentos obligatorios
	const jubilacion = Math.round(brutoProporcional * 11 / 100);
	const obraSocial = Math.round(brutoProporcional * obraSocialPct / 100);
	const ley19032 = Math.round(brutoProporcional * 3 / 100); // PAMI
	const sindicato = Math.round(brutoProporcional * sindicatoPct / 100);
	
	// Base para Ganancias (con deducciones)
	const deduccionEspecial = ARGENTINA_MNI / 12; // Mensualizado
	const deduccionHijos = tieneHijos ? (cantidadHijos * 78833) : 0; // Deducción por hijo
	const baseGanancias = Math.max(0, brutoProporcional - jubilacion - obraSocial - ley19032 - deduccionEspecial - deduccionHijos);
	const ganancias = argentinaCalcularGanancias(baseGanancias);
	
	const totalDescuentos = jubilacion + obraSocial + ley19032 + sindicato + ganancias;
	
	// Líquido final (bonos no remunerativos se suman al final)
	const liquido = brutoProporcional - totalDescuentos + bonoNoRemunerativo;
	
	return {
		pais: 'Argentina',
		sueldoBrutoBase: brutoBase,
		diasMes,
		diasTrabajados,
		sueldoBrutoProporcional: brutoProporcional,
		descuentos: {
			jubilacion: { porcentaje: 11, monto: jubilacion },
			obraSocial: { porcentaje: obraSocialPct, monto: obraSocial },
			ley19032Pami: { porcentaje: 3, monto: ley19032 },
			sindicato: { porcentaje: sindicatoPct, monto: sindicato },
			ganancias: {
				baseImponible: Math.round(baseGanancias),
				monto: ganancias,
				nota: baseGanancias <= 0 ? 'Exento (debajo del MNI)' : 'Según tabla 2024',
			},
			total: totalDescuentos,
		},
		bonosNoRemunerativos: bonoNoRemunerativo,
		sueldoLiquido: liquido,
		smvm2024: ARGENTINA_SMVM,
	};
}

function argentinaCalcularBrutoDesdeLiquido(
	liquidoDeseado: number,
	obraSocialPct: number = 3,
	sindicatoPct: number = 2,
	diasMes: number = 30,
	diasTrabajados: number = 30,
	bonoNoRemunerativo: number = 0
): object {
	// Líquido sin bonos
	const liquidoSinBonos = liquidoDeseado - bonoNoRemunerativo;
	
	// Descuentos básicos: 11% + obraSocial + 3% + sindicato = 17% + extras
	const descuentoBasePct = (11 + obraSocialPct + 3 + sindicatoPct) / 100;
	
	// Aproximación iterativa (por ganancias progresivas)
	let bruto = liquidoSinBonos / (1 - descuentoBasePct);
	for (let i = 0; i < 10; i++) {
		const resultado = argentinaCalcularSueldoLiquido(bruto, obraSocialPct, sindicatoPct, diasMes, diasTrabajados, 0, false, 0) as any;
		const diferencia = liquidoSinBonos - resultado.sueldoLiquido;
		bruto = bruto + diferencia;
	}
	const brutoProporcional = Math.round(bruto);
	
	// Bruto base (mes completo)
	const brutoBase = Math.round(brutoProporcional * diasMes / diasTrabajados);
	
	// Calcular resultado final
	const final = argentinaCalcularSueldoLiquido(brutoProporcional, obraSocialPct, sindicatoPct, diasMes, diasTrabajados, bonoNoRemunerativo, false, 0) as any;
	
	// Costo empresa (cargas sociales patronales ~23%)
	const cargasPatronales = Math.round(brutoProporcional * 0.23);
	const costoEmpresa = brutoProporcional + cargasPatronales + bonoNoRemunerativo;
	
	return {
		pais: 'Argentina',
		liquidoDeseado,
		diasMes,
		diasTrabajados,
		sueldoBrutoBase: brutoBase,
		sueldoBrutoProporcional: brutoProporcional,
		descuentos: final.descuentos,
		bonosNoRemunerativos: bonoNoRemunerativo,
		liquidoResultante: final.sueldoLiquido,
		costoEmpresa: {
			bruto: brutoProporcional,
			cargasPatronales,
			bonos: bonoNoRemunerativo,
			total: costoEmpresa,
			nota: 'Cargas patronales aprox 23% (jubilación, obra social, ART, etc.)',
		},
	};
}

function argentinaCalcularVacaciones(sueldoBruto: number, anosAntiguedad: number): object {
	let diasVacaciones = 14;
	if (anosAntiguedad >= 5) diasVacaciones = 21;
	if (anosAntiguedad >= 10) diasVacaciones = 28;
	if (anosAntiguedad >= 20) diasVacaciones = 35;
	
	const sueldoDiario = sueldoBruto / 25; // Argentina usa 25 días
	const montoVacaciones = Math.round(sueldoDiario * diasVacaciones);
	
	return {
		pais: 'Argentina',
		anosAntiguedad,
		diasVacaciones,
		sueldoDiario: Math.round(sueldoDiario),
		montoVacaciones,
		nota: 'Base 25 días hábiles mensuales',
	};
}

function argentinaCalcularSAC(mejorSueldoSemestre: number, mesesTrabajados: number = 6): object {
	const sacCompleto = mejorSueldoSemestre / 2;
	const sacProporcional = Math.round(sacCompleto * mesesTrabajados / 6);
	
	return {
		pais: 'Argentina',
		concepto: 'SAC (Sueldo Anual Complementario)',
		mejorSueldoSemestre,
		sacCompleto: Math.round(sacCompleto),
		mesesTrabajados,
		sacProporcional,
		fechasPago: ['30 de Junio', '18 de Diciembre'],
	};
}

function argentinaCalcularIndemnizacion(mejorSueldoUltimoAno: number, anosAntiguedad: number, diasVacacionesPendientes: number): object {
	const indemnizacion = mejorSueldoUltimoAno * anosAntiguedad;
	const preaviso = anosAntiguedad > 5 ? mejorSueldoUltimoAno * 2 : mejorSueldoUltimoAno;
	const sacProporcional = Math.round(mejorSueldoUltimoAno / 2 * (new Date().getMonth() + 1) / 6);
	const sueldoDiario = mejorSueldoUltimoAno / 25;
	const vacaciones = Math.round(sueldoDiario * diasVacacionesPendientes);
	
	const total = indemnizacion + preaviso + sacProporcional + vacaciones;
	
	return {
		pais: 'Argentina',
		desglose: {
			indemnizacion: { anos: anosAntiguedad, monto: indemnizacion },
			preaviso: { meses: anosAntiguedad > 5 ? 2 : 1, monto: preaviso },
			sacProporcional,
			vacaciones: { dias: diasVacacionesPendientes, monto: vacaciones },
		},
		totalIndemnizacion: total,
	};
}

// ==================== COLOMBIA - VALORES REALES 2024 ====================
// SMMLV 2024
const COLOMBIA_SMMLV = 1300000;
const COLOMBIA_AUXILIO_TRANSPORTE = 162000; // Para salarios hasta 2 SMMLV

// UVT 2024
const COLOMBIA_UVT = 47065;

// Tabla retención en la fuente 2024 (rangos en UVT)
const COLOMBIA_RETENCION_TABLA = [
	{ desde: 0, hasta: 95, tarifa: 0, adicional: 0 },
	{ desde: 95, hasta: 150, tarifa: 19, adicional: 0 },
	{ desde: 150, hasta: 360, tarifa: 28, adicional: 10 },
	{ desde: 360, hasta: 640, tarifa: 33, adicional: 69 },
	{ desde: 640, hasta: 945, tarifa: 35, adicional: 162 },
	{ desde: 945, hasta: 2300, tarifa: 37, adicional: 268 },
	{ desde: 2300, hasta: Infinity, tarifa: 39, adicional: 770 },
];

function colombiaCalcularRetencion(baseGravableUVT: number): number {
	for (const rango of COLOMBIA_RETENCION_TABLA) {
		if (baseGravableUVT > rango.desde && baseGravableUVT <= rango.hasta) {
			const excedente = baseGravableUVT - rango.desde;
			return Math.round((excedente * rango.tarifa / 100 + rango.adicional) * COLOMBIA_UVT);
		}
	}
	return 0;
}

function colombiaCalcularSueldoLiquido(
	bruto: number,
	diasMes: number = 30,
	diasTrabajados: number = 30,
	incluyeAuxilioTransporte: boolean = true,
	bonosNoSalariales: number = 0
): object {
	// Proporcional por días trabajados
	const brutoBase = bruto;
	const brutoProporcional = Math.round(bruto * diasTrabajados / diasMes);
	
	// Auxilio de transporte (solo si salario <= 2 SMMLV)
	const aplicaAuxilio = incluyeAuxilioTransporte && brutoBase <= (2 * COLOMBIA_SMMLV);
	const auxilioTransporte = aplicaAuxilio ? Math.round(COLOMBIA_AUXILIO_TRANSPORTE * diasTrabajados / diasMes) : 0;
	
	// Descuentos obligatorios
	const pension = Math.round(brutoProporcional * 4 / 100);
	const salud = Math.round(brutoProporcional * 4 / 100);
	
	// Fondo de Solidaridad Pensional (solo si > 4 SMMLV)
	let fondoSolidaridad = 0;
	if (brutoProporcional > 4 * COLOMBIA_SMMLV) {
		fondoSolidaridad = Math.round(brutoProporcional * 1 / 100);
	}
	
	// Retención en la fuente (si aplica)
	const baseGravable = brutoProporcional - pension - salud;
	const baseGravableUVT = baseGravable / COLOMBIA_UVT;
	const retencion = colombiaCalcularRetencion(baseGravableUVT);
	
	const totalDescuentos = pension + salud + fondoSolidaridad + retencion;
	
	// Líquido final
	const liquido = brutoProporcional - totalDescuentos + auxilioTransporte + bonosNoSalariales;
	
	return {
		pais: 'Colombia',
		sueldoBrutoBase: brutoBase,
		diasMes,
		diasTrabajados,
		sueldoBrutoProporcional: brutoProporcional,
		auxilioTransporte: {
			aplica: aplicaAuxilio,
			monto: auxilioTransporte,
			nota: aplicaAuxilio ? 'Salario <= 2 SMMLV' : 'No aplica (salario > 2 SMMLV)',
		},
		descuentos: {
			pension: { porcentaje: 4, monto: pension },
			salud: { porcentaje: 4, monto: salud },
			fondoSolidaridad: { aplica: fondoSolidaridad > 0, monto: fondoSolidaridad },
			retencionFuente: { baseUVT: Math.round(baseGravableUVT * 100) / 100, monto: retencion },
			total: totalDescuentos,
		},
		bonosNoSalariales,
		sueldoLiquido: liquido,
		smmlv2024: COLOMBIA_SMMLV,
	};
}

function colombiaCalcularBrutoDesdeLiquido(
	liquidoDeseado: number,
	diasMes: number = 30,
	diasTrabajados: number = 30,
	incluyeAuxilioTransporte: boolean = true,
	bonosNoSalariales: number = 0
): object {
	// Aproximación iterativa
	let bruto = liquidoDeseado * 1.12;
	for (let i = 0; i < 15; i++) {
		const resultado = colombiaCalcularSueldoLiquido(bruto, diasMes, diasTrabajados, incluyeAuxilioTransporte, bonosNoSalariales) as any;
		const diferencia = liquidoDeseado - resultado.sueldoLiquido;
		bruto = bruto + diferencia;
	}
	const brutoProporcional = Math.round(bruto);
	
	// Bruto base (mes completo)
	const brutoBase = Math.round(brutoProporcional * diasMes / diasTrabajados);
	
	// Calcular resultado final
	const final = colombiaCalcularSueldoLiquido(brutoProporcional, diasMes, diasTrabajados, incluyeAuxilioTransporte, bonosNoSalariales) as any;
	
	// Costo empresa (aportes patronales ~21.5%)
	const pensionPatronal = Math.round(brutoProporcional * 12 / 100);
	const saludPatronal = Math.round(brutoProporcional * 8.5 / 100);
	const arlPatronal = Math.round(brutoProporcional * 0.522 / 100); // Riesgo I
	const cajaCompensacion = Math.round(brutoProporcional * 4 / 100);
	const icbf = Math.round(brutoProporcional * 3 / 100);
	const sena = Math.round(brutoProporcional * 2 / 100);
	const cargasPatronales = pensionPatronal + saludPatronal + arlPatronal + cajaCompensacion + icbf + sena;
	const costoEmpresa = brutoProporcional + cargasPatronales + final.auxilioTransporte.monto + bonosNoSalariales;
	
	return {
		pais: 'Colombia',
		liquidoDeseado,
		diasMes,
		diasTrabajados,
		sueldoBrutoBase: brutoBase,
		sueldoBrutoProporcional: brutoProporcional,
		auxilioTransporte: final.auxilioTransporte,
		descuentos: final.descuentos,
		bonosNoSalariales,
		liquidoResultante: final.sueldoLiquido,
		costoEmpresa: {
			bruto: brutoProporcional,
			pensionPatronal12: pensionPatronal,
			saludPatronal85: saludPatronal,
			arl: arlPatronal,
			cajaCompensacion4: cajaCompensacion,
			icbf3: icbf,
			sena2: sena,
			auxilioTransporte: final.auxilioTransporte.monto,
			bonos: bonosNoSalariales,
			total: costoEmpresa,
		},
	};
}

function colombiaCalcularPrima(sueldoMensual: number, mesesTrabajados: number = 6): object {
	const primaCompleta = sueldoMensual / 2;
	const primaProporcional = Math.round(primaCompleta * mesesTrabajados / 6);
	
	return {
		pais: 'Colombia',
		concepto: 'Prima de Servicios',
		sueldoMensual,
		primaCompleta: Math.round(primaCompleta),
		mesesTrabajados,
		primaProporcional,
		fechasPago: ['30 de Junio', '20 de Diciembre'],
	};
}

function colombiaCalcularCesantias(sueldoMensual: number, diasTrabajados: number = 360): object {
	const cesantias = Math.round(sueldoMensual * diasTrabajados / 360);
	const interesesCesantias = Math.round(cesantias * 12 / 100);
	
	return {
		pais: 'Colombia',
		concepto: 'Cesantías',
		sueldoMensual,
		diasTrabajados,
		cesantias,
		interesesCesantias12: interesesCesantias,
		total: cesantias + interesesCesantias,
		fechaConsignacion: '14 de Febrero',
	};
}

function colombiaCalcularLiquidacion(sueldoMensual: number, anosAntiguedad: number, diasTrabajadosUltimoAno: number): object {
	const sueldoDiario = sueldoMensual / 30;
	const indemnizacion = Math.round(sueldoMensual * anosAntiguedad);
	const cesantias = Math.round(sueldoMensual * diasTrabajadosUltimoAno / 360);
	const interesesCesantias = Math.round(cesantias * 12 / 100);
	const primaProporcional = Math.round(sueldoMensual * diasTrabajadosUltimoAno / 720);
	const vacacionesProporcionales = Math.round(sueldoDiario * 15 * diasTrabajadosUltimoAno / 360);
	
	const total = indemnizacion + cesantias + interesesCesantias + primaProporcional + vacacionesProporcionales;
	
	return {
		pais: 'Colombia',
		desglose: {
			indemnizacion: { anos: anosAntiguedad, monto: indemnizacion },
			cesantias,
			interesesCesantias,
			primaProporcional,
			vacacionesProporcionales,
		},
		totalLiquidacion: total,
	};
}

// ==================== PERU - AFPs REALES 2024 ====================
// RMV (Remuneración Mínima Vital) 2024
const PERU_RMV = 1025;

// AFPs con comisiones reales 2024 (flujo)
const PERU_AFPS: { [key: string]: { nombre: string; comisionFlujo: number; seguro: number } } = {
	'habitat': { nombre: 'AFP Habitat', comisionFlujo: 1.47, seguro: 1.36 },
	'integra': { nombre: 'AFP Integra', comisionFlujo: 1.55, seguro: 1.36 },
	'prima': { nombre: 'AFP Prima', comisionFlujo: 1.60, seguro: 1.36 },
	'profuturo': { nombre: 'AFP Profuturo', comisionFlujo: 1.69, seguro: 1.36 },
};

// ONP (sistema público)
const PERU_ONP_PCT = 13;

// Tope para 5ta categoría 2024
const PERU_UIT = 5150;
const PERU_TOPE_5TA = 7 * PERU_UIT; // 7 UIT exento

function peruCalcular5taCategoria(remuneracionAnual: number): number {
	// Proyección anual - simplificado
	const baseGravable = Math.max(0, remuneracionAnual - PERU_TOPE_5TA);
	if (baseGravable <= 0) return 0;
	
	// Tasas progresivas
	let impuesto = 0;
	if (baseGravable <= 5 * PERU_UIT) {
		impuesto = baseGravable * 0.08;
	} else if (baseGravable <= 20 * PERU_UIT) {
		impuesto = 5 * PERU_UIT * 0.08 + (baseGravable - 5 * PERU_UIT) * 0.14;
	} else if (baseGravable <= 35 * PERU_UIT) {
		impuesto = 5 * PERU_UIT * 0.08 + 15 * PERU_UIT * 0.14 + (baseGravable - 20 * PERU_UIT) * 0.17;
	} else if (baseGravable <= 45 * PERU_UIT) {
		impuesto = 5 * PERU_UIT * 0.08 + 15 * PERU_UIT * 0.14 + 15 * PERU_UIT * 0.17 + (baseGravable - 35 * PERU_UIT) * 0.20;
	} else {
		impuesto = 5 * PERU_UIT * 0.08 + 15 * PERU_UIT * 0.14 + 15 * PERU_UIT * 0.17 + 10 * PERU_UIT * 0.20 + (baseGravable - 45 * PERU_UIT) * 0.30;
	}
	
	// Retorno mensual (dividido entre 12)
	return Math.round(impuesto / 12);
}

function peruCalcularSueldoLiquido(
	bruto: number,
	sistemaAFP: string = 'habitat', // 'habitat', 'integra', 'prima', 'profuturo', 'onp'
	diasMes: number = 30,
	diasTrabajados: number = 30,
	asignacionFamiliar: boolean = false,
	bonosNoAfectos: number = 0
): object {
	// Proporcional por días trabajados
	const brutoBase = bruto;
	const brutoProporcional = Math.round(bruto * diasTrabajados / diasMes);
	
	// Asignación familiar (10% RMV si tiene hijos)
	const asignacion = asignacionFamiliar ? Math.round(PERU_RMV * 0.10) : 0;
	const baseAportes = brutoProporcional + asignacion;
	
	let descuentoPension = 0;
	let comision = 0;
	let seguro = 0;
	let sistemaNombre = '';
	
	if (sistemaAFP === 'onp') {
		// ONP (sistema público)
		descuentoPension = Math.round(baseAportes * PERU_ONP_PCT / 100);
		sistemaNombre = 'ONP (Sistema Nacional de Pensiones)';
	} else {
		// AFP privada
		const afp = PERU_AFPS[sistemaAFP] || PERU_AFPS['habitat'];
		descuentoPension = Math.round(baseAportes * 10 / 100); // Aporte obligatorio 10%
		comision = Math.round(baseAportes * afp.comisionFlujo / 100);
		seguro = Math.round(baseAportes * afp.seguro / 100);
		sistemaNombre = afp.nombre;
	}
	
	// 5ta categoría (impuesto a la renta)
	const proyeccionAnual = baseAportes * 12 + baseAportes * 2; // + gratificaciones
	const retencion5ta = peruCalcular5taCategoria(proyeccionAnual);
	
	const totalDescuentos = descuentoPension + comision + seguro + retencion5ta;
	
	// Líquido final
	const liquido = baseAportes - totalDescuentos + bonosNoAfectos;
	
	return {
		pais: 'Perú',
		sueldoBrutoBase: brutoBase,
		diasMes,
		diasTrabajados,
		sueldoBrutoProporcional: brutoProporcional,
		asignacionFamiliar: {
			aplica: asignacionFamiliar,
			monto: asignacion,
			nota: asignacionFamiliar ? '10% de RMV' : 'No aplica',
		},
		baseAportes,
		sistemaPensiones: {
			nombre: sistemaNombre,
			aporte: descuentoPension,
			comision: comision,
			seguro: seguro,
		},
		descuentos: {
			pension: descuentoPension,
			comision,
			seguro,
			retencion5ta: { monto: retencion5ta, nota: retencion5ta > 0 ? 'Según proyección anual' : 'Exento (< 7 UIT)' },
			total: totalDescuentos,
		},
		bonosNoAfectos,
		sueldoLiquido: liquido,
		rmv2024: PERU_RMV,
	};
}

function peruCalcularBrutoDesdeLiquido(
	liquidoDeseado: number,
	sistemaAFP: string = 'habitat',
	diasMes: number = 30,
	diasTrabajados: number = 30,
	asignacionFamiliar: boolean = false,
	bonosNoAfectos: number = 0
): object {
	// Líquido sin bonos
	const liquidoSinBonos = liquidoDeseado - bonosNoAfectos;
	
	// Aproximación iterativa
	let bruto = liquidoSinBonos * 1.15;
	for (let i = 0; i < 15; i++) {
		const resultado = peruCalcularSueldoLiquido(bruto, sistemaAFP, diasMes, diasTrabajados, asignacionFamiliar, 0) as any;
		const diferencia = liquidoSinBonos - resultado.sueldoLiquido;
		bruto = bruto + diferencia;
	}
	const brutoProporcional = Math.round(bruto);
	
	// Bruto base (mes completo)
	const brutoBase = Math.round(brutoProporcional * diasMes / diasTrabajados);
	
	// Calcular resultado final
	const final = peruCalcularSueldoLiquido(brutoProporcional, sistemaAFP, diasMes, diasTrabajados, asignacionFamiliar, bonosNoAfectos) as any;
	
	// Costo empresa (EsSalud 9%)
	const essalud = Math.round(final.baseAportes * 9 / 100);
	const costoEmpresa = final.baseAportes + essalud + bonosNoAfectos;
	
	return {
		pais: 'Perú',
		liquidoDeseado,
		diasMes,
		diasTrabajados,
		sueldoBrutoBase: brutoBase,
		sueldoBrutoProporcional: brutoProporcional,
		asignacionFamiliar: final.asignacionFamiliar,
		sistemaPensiones: final.sistemaPensiones,
		descuentos: final.descuentos,
		bonosNoAfectos,
		liquidoResultante: final.sueldoLiquido,
		costoEmpresa: {
			baseAportes: final.baseAportes,
			essalud9: essalud,
			bonos: bonosNoAfectos,
			total: costoEmpresa,
			nota: 'EsSalud 9% lo paga empleador',
		},
	};
}

function peruCalcularGratificacion(sueldoMensual: number, mesesTrabajados: number = 6): object {
	const gratificacionCompleta = sueldoMensual;
	const bonificacionExtraordinaria = Math.round(sueldoMensual * 9 / 100);
	const gratificacionProporcional = Math.round((gratificacionCompleta + bonificacionExtraordinaria) * mesesTrabajados / 6);
	
	return {
		pais: 'Perú',
		concepto: 'Gratificación',
		sueldoMensual,
		gratificacionCompleta,
		bonificacion9: bonificacionExtraordinaria,
		mesesTrabajados,
		gratificacionProporcional,
		fechasPago: ['15 de Julio', '15 de Diciembre'],
	};
}

function peruCalcularCTS(sueldoMensual: number, mesesTrabajados: number = 6): object {
	const gratificacionProporcional = sueldoMensual / 6;
	const remuneracionComputable = sueldoMensual + gratificacionProporcional;
	const cts = Math.round(remuneracionComputable * mesesTrabajados / 12);
	
	return {
		pais: 'Perú',
		concepto: 'CTS (Compensación por Tiempo de Servicios)',
		sueldoMensual,
		remuneracionComputable: Math.round(remuneracionComputable),
		mesesTrabajados,
		cts,
		fechasDeposito: ['15 de Mayo', '15 de Noviembre'],
	};
}

function peruCalcularLiquidacion(sueldoMensual: number, anosAntiguedad: number, mesesUltimoAno: number): object {
	const indemnizacion = Math.round(sueldoMensual * 1.5 * anosAntiguedad);
	const topeIndemnizacion = sueldoMensual * 12;
	const indemnizacionFinal = Math.min(indemnizacion, topeIndemnizacion);
	
	const cts = Math.round(sueldoMensual * mesesUltimoAno / 12);
	const gratificacionProporcional = Math.round(sueldoMensual * mesesUltimoAno / 6);
	const vacacionesTruncas = Math.round(sueldoMensual * mesesUltimoAno / 12);
	
	const total = indemnizacionFinal + cts + gratificacionProporcional + vacacionesTruncas;
	
	return {
		pais: 'Perú',
		desglose: {
			indemnizacion: { anos: anosAntiguedad, monto: indemnizacionFinal, tope: topeIndemnizacion },
			ctsPendiente: cts,
			gratificacionTrunca: gratificacionProporcional,
			vacacionesTruncas,
		},
		totalLiquidacion: total,
	};
}

// ==================== BRASIL - TABELAS REAIS 2024 ====================
// Salário Mínimo 2024
const BRASIL_SALARIO_MINIMO = 1412.00;

// Tabela INSS 2024 (progressiva)
const BRASIL_INSS_TABELA = [
	{ ate: 1412.00, aliquota: 7.5 },
	{ ate: 2666.68, aliquota: 9 },
	{ ate: 4000.03, aliquota: 12 },
	{ ate: 7786.02, aliquota: 14 },
];
const BRASIL_INSS_TETO = 908.85;

// Tabela IRRF 2024
const BRASIL_IRRF_TABELA = [
	{ ate: 2259.20, aliquota: 0, deducao: 0 },
	{ ate: 2826.65, aliquota: 7.5, deducao: 169.44 },
	{ ate: 3751.05, aliquota: 15, deducao: 381.44 },
	{ ate: 4664.68, aliquota: 22.5, deducao: 662.77 },
	{ ate: Infinity, aliquota: 27.5, deducao: 896.00 },
];
const BRASIL_DEDUCAO_DEPENDENTE = 189.59;

function brasilCalcularINSS(salario: number): number {
	let inss = 0;
	let salarioRestante = salario;
	let faixaAnterior = 0;
	
	for (const faixa of BRASIL_INSS_TABELA) {
		if (salarioRestante <= 0) break;
		const baseCalculo = Math.min(salarioRestante, faixa.ate - faixaAnterior);
		inss += baseCalculo * faixa.aliquota / 100;
		salarioRestante -= baseCalculo;
		faixaAnterior = faixa.ate;
	}
	
	return Math.min(Math.round(inss * 100) / 100, BRASIL_INSS_TETO);
}

function brasilCalcularIRRF(baseCalculo: number, dependentes: number = 0): number {
	const deducaoDependentes = dependentes * BRASIL_DEDUCAO_DEPENDENTE;
	const baseIrrf = baseCalculo - deducaoDependentes;
	
	if (baseIrrf <= 0) return 0;
	
	for (const faixa of BRASIL_IRRF_TABELA) {
		if (baseIrrf <= faixa.ate) {
			const irrf = (baseIrrf * faixa.aliquota / 100) - faixa.deducao;
			return Math.max(0, Math.round(irrf * 100) / 100);
		}
	}
	return 0;
}

function brasilCalcularSueldoLiquido(
	bruto: number,
	diasMes: number = 30,
	diasTrabalhados: number = 30,
	dependentes: number = 0,
	valeTransporte: boolean = false,
	valeRefeicao: number = 0,
	outrosBeneficios: number = 0
): object {
	// Proporcional por dias trabalhados
	const brutoBase = bruto;
	const brutoProporcional = Math.round(bruto * diasTrabalhados / diasMes * 100) / 100;
	
	// INSS progressivo
	const inss = brasilCalcularINSS(brutoProporcional);
	
	// Base para IRRF
	const baseIrrf = brutoProporcional - inss;
	const irrf = brasilCalcularIRRF(baseIrrf, dependentes);
	
	// Vale transporte (desconto 6% se optar)
	const descontoVT = valeTransporte ? Math.round(brutoProporcional * 6 / 100) : 0;
	
	const totalDescontos = Math.round((inss + irrf + descontoVT) * 100) / 100;
	
	// Benefícios (não tributados)
	const totalBeneficios = valeRefeicao + outrosBeneficios;
	
	// Líquido final
	const liquido = Math.round((brutoProporcional - totalDescontos + totalBeneficios) * 100) / 100;
	
	return {
		pais: 'Brasil',
		salarioBrutoBase: brutoBase,
		diasMes,
		diasTrabalhados,
		salarioBrutoProporcional: brutoProporcional,
		descontos: {
			inss: { monto: inss, nota: 'Tabela progressiva 2024', teto: BRASIL_INSS_TETO },
			irrf: { base: baseIrrf, dependentes, monto: irrf },
			valeTransporte: { aplica: valeTransporte, desconto6: descontoVT },
			total: totalDescontos,
		},
		beneficios: {
			valeRefeicao,
			outros: outrosBeneficios,
			total: totalBeneficios,
		},
		salarioLiquido: liquido,
		salarioMinimo2024: BRASIL_SALARIO_MINIMO,
	};
}

function brasilCalcularBrutoDesdeLiquido(
	liquidoDesejado: number,
	diasMes: number = 30,
	diasTrabalhados: number = 30,
	dependentes: number = 0,
	valeTransporte: boolean = false,
	valeRefeicao: number = 0,
	outrosBeneficios: number = 0
): object {
	// Benefícios
	const totalBeneficios = valeRefeicao + outrosBeneficios;
	const liquidoSemBeneficios = liquidoDesejado - totalBeneficios;
	
	// Aproximação iterativa
	let bruto = liquidoSemBeneficios * 1.30;
	for (let i = 0; i < 15; i++) {
		const resultado = brasilCalcularSueldoLiquido(bruto, diasMes, diasTrabalhados, dependentes, valeTransporte, 0, 0) as any;
		const diferencia = liquidoSemBeneficios - resultado.salarioLiquido;
		bruto = bruto + diferencia;
	}
	const brutoProporcional = Math.round(bruto * 100) / 100;
	
	// Bruto base (mês completo)
	const brutoBase = Math.round(brutoProporcional * diasMes / diasTrabalhados * 100) / 100;
	
	// Calcular resultado final
	const final = brasilCalcularSueldoLiquido(brutoProporcional, diasMes, diasTrabalhados, dependentes, valeTransporte, valeRefeicao, outrosBeneficios) as any;
	
	// Custo empresa (FGTS 8% + INSS patronal ~20%)
	const fgts = Math.round(brutoProporcional * 8 / 100);
	const inssPatronal = Math.round(brutoProporcional * 20 / 100);
	const custoEmpresa = brutoProporcional + fgts + inssPatronal + totalBeneficios;
	
	return {
		pais: 'Brasil',
		liquidoDesejado,
		diasMes,
		diasTrabalhados,
		salarioBrutoBase: brutoBase,
		salarioBrutoProporcional: brutoProporcional,
		descontos: final.descontos,
		beneficios: final.beneficios,
		liquidoResultante: final.salarioLiquido,
		custoEmpresa: {
			bruto: brutoProporcional,
			fgts8: fgts,
			inssPatronal20: inssPatronal,
			beneficios: totalBeneficios,
			total: Math.round(custoEmpresa),
			nota: 'FGTS 8% + encargos patronais ~20%',
		},
	};
}

function brasilCalcularFerias(salarioMensual: number, diasFerias: number = 30): object {
	const salarioDiario = salarioMensual / 30;
	const feriasBruto = Math.round(salarioDiario * diasFerias);
	const tercoConstitucional = Math.round(feriasBruto / 3);
	const total = feriasBruto + tercoConstitucional;
	
	return {
		pais: 'Brasil',
		conceito: 'Férias',
		salarioMensual,
		diasFerias,
		feriasBruto,
		tercoConstitucional,
		totalBruto: total,
		nota: '1/3 constitucional obrigatório',
	};
}

function brasilCalcularDecimoTerceiro(salarioMensual: number, mesesTrabalhados: number = 12): object {
	const decimoCompleto = salarioMensual;
	const decimoProporcional = Math.round(decimoCompleto * mesesTrabalhados / 12);
	
	return {
		pais: 'Brasil',
		conceito: '13° Salário',
		salarioMensual,
		decimoCompleto,
		mesesTrabalhados,
		decimoProporcional,
		parcelas: ['1ª parcela: até 30/Nov', '2ª parcela: até 20/Dez'],
	};
}

function brasilCalcularRescisao(salarioMensual: number, mesesTrabalhados: number, saldoFgts: number, demissaoSemJustaCausa: boolean = true): object {
	const avisoPrevio = salarioMensual;
	const decimoProporcional = Math.round(salarioMensual * mesesTrabalhados / 12);
	const feriasProporcional = Math.round((salarioMensual * mesesTrabalhados / 12) * 4 / 3);
	const multaFgts = demissaoSemJustaCausa ? Math.round(saldoFgts * 0.40) : 0;
	
	const total = avisoPrevio + decimoProporcional + feriasProporcional + saldoFgts + multaFgts;
	
	return {
		pais: 'Brasil',
		desglose: {
			avisoPrevioIndenizado: avisoPrevio,
			decimoTerceiroProporcional: decimoProporcional,
			feriasProporcionalComTerco: feriasProporcional,
			saqueFgts: saldoFgts,
			multaFgts40: multaFgts,
		},
		totalRescisao: total,
		tipo: demissaoSemJustaCausa ? 'Demissão sem justa causa' : 'Demissão com justa causa',
	};
}

// ==================== ECUADOR - VALORES REALES 2024 ====================
// SBU (Salario Básico Unificado) 2024
const ECUADOR_SBU = 460;

// Tabla Impuesto a la Renta 2024
const ECUADOR_IR_TABLA = [
	{ desde: 0, hasta: 11902, impuesto: 0, exceso: 0 },
	{ desde: 11902, hasta: 15159, impuesto: 0, exceso: 5 },
	{ desde: 15159, hasta: 19682, impuesto: 163, exceso: 10 },
	{ desde: 19682, hasta: 26031, impuesto: 615, exceso: 12 },
	{ desde: 26031, hasta: 34255, impuesto: 1377, exceso: 15 },
	{ desde: 34255, hasta: 45407, impuesto: 2611, exceso: 20 },
	{ desde: 45407, hasta: 60450, impuesto: 4841, exceso: 25 },
	{ desde: 60450, hasta: 80605, impuesto: 8602, exceso: 30 },
	{ desde: 80605, hasta: 107199, impuesto: 14648, exceso: 35 },
	{ desde: 107199, hasta: Infinity, impuesto: 23956, exceso: 37 },
];

function ecuadorCalcularIR(baseAnual: number): number {
	for (const tramo of ECUADOR_IR_TABLA) {
		if (baseAnual > tramo.desde && baseAnual <= tramo.hasta) {
			const excedente = baseAnual - tramo.desde;
			return Math.round((tramo.impuesto + excedente * tramo.exceso / 100) / 12);
		}
	}
	return 0;
}

function ecuadorCalcularSueldoLiquido(
	bruto: number,
	diasMes: number = 30,
	diasTrabajados: number = 30,
	fondosReserva: boolean = true, // Mensualizado o acumulado
	bonosNoGravables: number = 0
): object {
	// Proporcional por días trabajados
	const brutoBase = bruto;
	const brutoProporcional = Math.round(bruto * diasTrabajados / diasMes);
	
	// IESS personal (9.45%)
	const iessPersonal = Math.round(brutoProporcional * 9.45 / 100);
	
	// Impuesto a la Renta (proyección anual)
	const proyeccionAnual = brutoProporcional * 12;
	const impuestoRenta = ecuadorCalcularIR(proyeccionAnual);
	
	// Fondos de reserva (8.33% mensualizado si aplica)
	const fondosReservaMonto = fondosReserva ? Math.round(brutoProporcional * 8.33 / 100) : 0;
	
	const totalDescuentos = iessPersonal + impuestoRenta;
	
	// Líquido final (fondos de reserva suman si se pagan mensual)
	const liquido = brutoProporcional - totalDescuentos + (fondosReserva ? fondosReservaMonto : 0) + bonosNoGravables;
	
	return {
		pais: 'Ecuador',
		sueldoBrutoBase: brutoBase,
		diasMes,
		diasTrabajados,
		sueldoBrutoProporcional: brutoProporcional,
		descuentos: {
			iessPersonal: { porcentaje: 9.45, monto: iessPersonal },
			impuestoRenta: { proyeccionAnual, montoMensual: impuestoRenta },
			total: totalDescuentos,
		},
		fondosReserva: {
			mensualizado: fondosReserva,
			porcentaje: 8.33,
			monto: fondosReservaMonto,
			nota: fondosReserva ? 'Pagados mensualmente' : 'Acumulados en IESS',
		},
		bonosNoGravables,
		sueldoLiquido: liquido,
		sbu2024: ECUADOR_SBU,
	};
}

function ecuadorCalcularBrutoDesdeLiquido(
	liquidoDeseado: number,
	diasMes: number = 30,
	diasTrabajados: number = 30,
	fondosReserva: boolean = true,
	bonosNoGravables: number = 0
): object {
	// Aproximación iterativa
	let bruto = liquidoDeseado * 1.12;
	for (let i = 0; i < 15; i++) {
		const resultado = ecuadorCalcularSueldoLiquido(bruto, diasMes, diasTrabajados, fondosReserva, bonosNoGravables) as any;
		const diferencia = liquidoDeseado - resultado.sueldoLiquido;
		bruto = bruto + diferencia;
	}
	const brutoProporcional = Math.round(bruto);
	
	// Bruto base (mes completo)
	const brutoBase = Math.round(brutoProporcional * diasMes / diasTrabajados);
	
	// Calcular resultado final
	const final = ecuadorCalcularSueldoLiquido(brutoProporcional, diasMes, diasTrabajados, fondosReserva, bonosNoGravables) as any;
	
	// Costo empresa
	const iessPatronal = Math.round(brutoProporcional * 11.15 / 100);
	const fondosReservaPatronal = !fondosReserva ? Math.round(brutoProporcional * 8.33 / 100) : 0;
	const costoEmpresa = brutoProporcional + iessPatronal + fondosReservaPatronal + bonosNoGravables;
	
	return {
		pais: 'Ecuador',
		liquidoDeseado,
		diasMes,
		diasTrabajados,
		sueldoBrutoBase: brutoBase,
		sueldoBrutoProporcional: brutoProporcional,
		descuentos: final.descuentos,
		fondosReserva: final.fondosReserva,
		bonosNoGravables,
		liquidoResultante: final.sueldoLiquido,
		costoEmpresa: {
			bruto: brutoProporcional,
			iessPatronal1115: iessPatronal,
			fondosReserva: fondosReservaPatronal,
			bonos: bonosNoGravables,
			total: costoEmpresa,
			nota: 'IESS patronal 11.15% + fondos reserva si acumulados',
		},
	};
}

function ecuadorCalcularDecimoTercero(sueldoMensual: number, mesesTrabajados: number = 12): object {
	const decimoCompleto = sueldoMensual;
	const decimoProporcional = Math.round(decimoCompleto * mesesTrabajados / 12);
	
	return {
		pais: 'Ecuador',
		concepto: 'Décimo Tercer Sueldo',
		sueldoMensual,
		decimoCompleto,
		mesesTrabajados,
		decimoProporcional,
		fechaPago: 'Hasta 24 de Diciembre',
	};
}

function ecuadorCalcularDecimoCuarto(sbu: number = 460, mesesTrabajados: number = 12): object {
	const decimoCuartoCompleto = sbu;
	const decimoCuartoProporcional = Math.round(sbu * mesesTrabajados / 12);
	
	return {
		pais: 'Ecuador',
		concepto: 'Décimo Cuarto Sueldo',
		sbu2025: sbu,
		decimoCuartoCompleto,
		mesesTrabajados,
		decimoCuartoProporcional,
		fechaPago: 'Costa: Marzo / Sierra-Oriente: Agosto',
	};
}

function ecuadorCalcularLiquidacion(sueldoMensual: number, anosAntiguedad: number, mesesUltimoAno: number, sbu: number = 460): object {
	const sueldoDiario = sueldoMensual / 30;
	
	// Desahucio (25% del último sueldo por cada año)
	const desahucio = Math.round(sueldoMensual * 0.25 * anosAntiguedad);
	
	// Décimo tercero proporcional
	const decimoTercero = Math.round(sueldoMensual * mesesUltimoAno / 12);
	
	// Décimo cuarto proporcional
	const decimoCuarto = Math.round(sbu * mesesUltimoAno / 12);
	
	// Vacaciones no gozadas
	const vacaciones = Math.round(sueldoDiario * 15 * mesesUltimoAno / 12);
	
	const total = desahucio + decimoTercero + decimoCuarto + vacaciones;
	
	return {
		pais: 'Ecuador',
		desglose: {
			desahucio: { anos: anosAntiguedad, monto: desahucio },
			decimoTerceroProporcional: decimoTercero,
			decimoCuartoProporcional: decimoCuarto,
			vacacionesProporcionales: vacaciones,
		},
		totalLiquidacion: total,
	};
}

// ==================== ESPAÑA - VALORES REALES 2024 ====================
// SMI 2024 (14 pagas)
const ESPANA_SMI_MENSUAL = 1134;
const ESPANA_SMI_ANUAL = 15876;

// Bases cotización SS 2024
const ESPANA_BASE_MINIMA = 1323;
const ESPANA_BASE_MAXIMA = 4720.50;

// Tabla IRPF 2024 (estatal + autonómica promedio)
const ESPANA_IRPF_TABLA = [
	{ desde: 0, hasta: 12450, tipo: 19 },
	{ desde: 12450, hasta: 20200, tipo: 24 },
	{ desde: 20200, hasta: 35200, tipo: 30 },
	{ desde: 35200, hasta: 60000, tipo: 37 },
	{ desde: 60000, hasta: 300000, tipo: 45 },
	{ desde: 300000, hasta: Infinity, tipo: 47 },
];

function espanaCalcularIRPF(baseAnual: number): { tipoMedio: number; retencionAnual: number } {
	let impuesto = 0;
	let baseRestante = baseAnual;
	
	for (let i = 0; i < ESPANA_IRPF_TABLA.length && baseRestante > 0; i++) {
		const tramo = ESPANA_IRPF_TABLA[i];
		const anterior = i > 0 ? ESPANA_IRPF_TABLA[i-1].hasta : 0;
		const anchoTramo = tramo.hasta - anterior;
		const baseEnTramo = Math.min(baseRestante, anchoTramo);
		impuesto += baseEnTramo * tramo.tipo / 100;
		baseRestante -= baseEnTramo;
	}
	
	const tipoMedio = baseAnual > 0 ? Math.round(impuesto / baseAnual * 10000) / 100 : 0;
	return { tipoMedio, retencionAnual: Math.round(impuesto) };
}

function espanaCalcularSueldoLiquido(
	bruto: number,
	pagas: number = 12, // 12 o 14 pagas
	diasMes: number = 30,
	diasTrabajados: number = 30,
	tieneHijos: boolean = false,
	numHijos: number = 0,
	ticketRestaurante: number = 0,
	otrosBeneficios: number = 0
): object {
	// Proporcional por días trabajados
	const brutoBase = bruto;
	const brutoProporcional = Math.round(bruto * diasTrabajados / diasMes * 100) / 100;
	
	// Base cotización (con topes)
	const baseCotizacion = Math.min(Math.max(brutoProporcional, ESPANA_BASE_MINIMA), ESPANA_BASE_MAXIMA);
	
	// Cotizaciones trabajador
	const contingenciasComunes = Math.round(baseCotizacion * 4.70 / 100 * 100) / 100;
	const desempleo = Math.round(baseCotizacion * 1.55 / 100 * 100) / 100;
	const formacion = Math.round(baseCotizacion * 0.10 / 100 * 100) / 100;
	const totalSS = contingenciasComunes + desempleo + formacion;
	
	// IRPF (proyección anual)
	const brutoAnual = brutoProporcional * pagas;
	const reduccionHijos = tieneHijos ? (numHijos * 2400) : 0; // Mínimo por descendiente aprox
	const baseIRPF = Math.max(0, brutoAnual - reduccionHijos);
	const { tipoMedio, retencionAnual } = espanaCalcularIRPF(baseIRPF);
	const irpfMensual = Math.round(retencionAnual / pagas * 100) / 100;
	
	const totalDescuentos = Math.round((totalSS + irpfMensual) * 100) / 100;
	
	// Beneficios exentos
	const totalBeneficios = ticketRestaurante + otrosBeneficios;
	
	// Líquido final
	const liquido = Math.round((brutoProporcional - totalDescuentos + totalBeneficios) * 100) / 100;
	
	return {
		pais: 'España',
		sueldoBrutoBase: brutoBase,
		pagas,
		diasMes,
		diasTrabajados,
		sueldoBrutoProporcional: brutoProporcional,
		cotizacionesSS: {
			baseCotizacion,
			contingenciasComunes: { porcentaje: 4.70, monto: contingenciasComunes },
			desempleo: { porcentaje: 1.55, monto: desempleo },
			formacion: { porcentaje: 0.10, monto: formacion },
			total: totalSS,
		},
		irpf: {
			baseAnual: baseIRPF,
			tipoMedio,
			retencionMensual: irpfMensual,
		},
		descuentos: {
			seguridadSocial: totalSS,
			irpf: irpfMensual,
			total: totalDescuentos,
		},
		beneficios: {
			ticketRestaurante,
			otros: otrosBeneficios,
			total: totalBeneficios,
		},
		sueldoLiquido: liquido,
		smi2024: ESPANA_SMI_MENSUAL,
	};
}

function espanaCalcularBrutoDesdeLiquido(
	liquidoDeseado: number,
	pagas: number = 12,
	diasMes: number = 30,
	diasTrabajados: number = 30,
	tieneHijos: boolean = false,
	numHijos: number = 0,
	ticketRestaurante: number = 0,
	otrosBeneficios: number = 0
): object {
	// Beneficios
	const totalBeneficios = ticketRestaurante + otrosBeneficios;
	const liquidoSinBeneficios = liquidoDeseado - totalBeneficios;
	
	// Aproximación iterativa
	let bruto = liquidoSinBeneficios * 1.35;
	for (let i = 0; i < 15; i++) {
		const resultado = espanaCalcularSueldoLiquido(bruto, pagas, diasMes, diasTrabajados, tieneHijos, numHijos, 0, 0) as any;
		const diferencia = liquidoSinBeneficios - resultado.sueldoLiquido;
		bruto = bruto + diferencia;
	}
	const brutoProporcional = Math.round(bruto * 100) / 100;
	
	// Bruto base (mes completo)
	const brutoBase = Math.round(brutoProporcional * diasMes / diasTrabajados * 100) / 100;
	
	// Calcular resultado final
	const final = espanaCalcularSueldoLiquido(brutoProporcional, pagas, diasMes, diasTrabajados, tieneHijos, numHijos, ticketRestaurante, otrosBeneficios) as any;
	
	// Costo empresa (SS empresa ~30%)
	const ssEmpresa = Math.round(brutoProporcional * 30 / 100);
	const costoEmpresa = brutoProporcional + ssEmpresa + totalBeneficios;
	
	return {
		pais: 'España',
		liquidoDeseado,
		pagas,
		diasMes,
		diasTrabajados,
		sueldoBrutoBase: brutoBase,
		sueldoBrutoProporcional: brutoProporcional,
		cotizacionesSS: final.cotizacionesSS,
		irpf: final.irpf,
		descuentos: final.descuentos,
		beneficios: final.beneficios,
		liquidoResultante: final.sueldoLiquido,
		costoEmpresa: {
			bruto: brutoProporcional,
			ssEmpresa30: ssEmpresa,
			beneficios: totalBeneficios,
			total: Math.round(costoEmpresa),
			nota: 'SS empresa ~30% (contingencias, AT/EP, desempleo, FOGASA, FP)',
		},
	};
}

function espanaCalcularVacaciones(sueldoAnual: number, diasPendientes: number): object {
	const sueldoDiario = sueldoAnual / 365;
	const montoVacaciones = Math.round(sueldoDiario * diasPendientes);
	
	return {
		pais: 'España',
		diasLegales: '30 naturales (22 hábiles)',
		diasPendientes,
		sueldoDiario: Math.round(sueldoDiario),
		montoVacaciones,
	};
}

function espanaCalcularPagasExtras(sueldoMensual: number, mesesTrabajados: number = 6): object {
	const pagaCompleta = sueldoMensual;
	const pagaProporcional = Math.round(pagaCompleta * mesesTrabajados / 6);
	
	return {
		pais: 'España',
		concepto: 'Paga Extra',
		sueldoMensual,
		pagaCompleta,
		mesesTrabajados,
		pagaProporcional,
		fechasPago: ['Junio', 'Diciembre'],
		nota: 'Mínimo 2 pagas anuales. Pueden estar prorrateadas.',
	};
}

function espanaCalcularFiniquito(sueldoAnual: number, anosAntiguedad: number, diasVacacionesPendientes: number): object {
	const sueldoDiario = sueldoAnual / 365;
	const sueldoMensual = sueldoAnual / 12;
	
	// Indemnización: 33 días por año (despido improcedente post-2012)
	const diasIndemnizacion = Math.min(anosAntiguedad * 33, 720); // Tope 24 mensualidades
	const indemnizacion = Math.round(sueldoDiario * diasIndemnizacion);
	
	// Vacaciones no disfrutadas
	const vacaciones = Math.round(sueldoDiario * diasVacacionesPendientes);
	
	// Pagas extras proporcionales (2 al año)
	const mesesDelAno = new Date().getMonth() + 1;
	const pagasProporcionalesEnero = Math.round(sueldoMensual * mesesDelAno / 6);
	const pagasProporcionalesJulio = Math.round(sueldoMensual * Math.max(0, mesesDelAno - 6) / 6);
	const pagasExtras = pagasProporcionalesEnero + pagasProporcionalesJulio;
	
	const total = indemnizacion + vacaciones + pagasExtras;
	
	return {
		pais: 'España',
		desglose: {
			indemnizacion: { dias: diasIndemnizacion, monto: indemnizacion, formula: '33 días/año, tope 720 días' },
			vacacionesPendientes: { dias: diasVacacionesPendientes, monto: vacaciones },
			pagasExtrasProporcionales: pagasExtras,
		},
		totalFiniquito: total,
	};
}

// ==================== NODE PRINCIPAL ====================
export class LatamPayroll implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LATAM Payroll',
		name: 'latamPayroll',
		icon: 'file:payroll.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["pais"] + " - " + $parameter["operation"]}}',
		description: 'Cálculos laborales LATAM - Vacaciones, Aguinaldo, Finiquito, Descuentos',
		defaults: {
			name: 'LATAM Payroll',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'País',
				name: 'pais',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: '🇨🇱 Chile', value: 'chile' },
					{ name: '🇲🇽 México', value: 'mexico' },
					{ name: '🇦🇷 Argentina', value: 'argentina' },
					{ name: '🇨🇴 Colombia', value: 'colombia' },
					{ name: '🇵🇪 Perú', value: 'peru' },
					{ name: '🇧🇷 Brasil', value: 'brasil' },
					{ name: '🇪🇨 Ecuador', value: 'ecuador' },
					{ name: '🇪🇸 España', value: 'espana' },
				],
				default: 'chile',
			},
			// ===== CHILE =====
			{
				displayName: 'Operación',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { pais: ['chile'] } },
				options: [
					{ name: 'Bruto desde Líquido', value: 'bruto_liquido', action: 'Calcular bruto desde liquido' },
					{ name: 'Sueldo Líquido', value: 'sueldo_liquido', action: 'Calcular sueldo liquido' },
					{ name: 'Vacaciones', value: 'vacaciones', action: 'Calcular vacaciones' },
					{ name: 'Finiquito', value: 'finiquito', action: 'Calcular finiquito' },
				],
				default: 'bruto_liquido',
			},
			// ===== MEXICO =====
			{
				displayName: 'Operación',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { pais: ['mexico'] } },
				options: [
					{ name: 'Bruto desde Líquido', value: 'bruto_liquido', action: 'Calcular bruto desde liquido' },
					{ name: 'Sueldo Líquido', value: 'sueldo_liquido', action: 'Calcular sueldo liquido' },
					{ name: 'Vacaciones', value: 'vacaciones', action: 'Calcular vacaciones' },
					{ name: 'Aguinaldo', value: 'aguinaldo', action: 'Calcular aguinaldo' },
					{ name: 'Finiquito', value: 'finiquito', action: 'Calcular finiquito' },
				],
				default: 'bruto_liquido',
			},
			// ===== ARGENTINA =====
			{
				displayName: 'Operación',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { pais: ['argentina'] } },
				options: [
					{ name: 'Bruto desde Líquido', value: 'bruto_liquido', action: 'Calcular bruto desde liquido' },
					{ name: 'Sueldo Líquido', value: 'sueldo_liquido', action: 'Calcular sueldo liquido' },
					{ name: 'Vacaciones', value: 'vacaciones', action: 'Calcular vacaciones' },
					{ name: 'SAC (Aguinaldo)', value: 'sac', action: 'Calcular SAC' },
					{ name: 'Indemnización', value: 'indemnizacion', action: 'Calcular indemnizacion' },
				],
				default: 'bruto_liquido',
			},
			// ===== COLOMBIA =====
			{
				displayName: 'Operación',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { pais: ['colombia'] } },
				options: [
					{ name: 'Bruto desde Líquido', value: 'bruto_liquido', action: 'Calcular bruto desde liquido' },
					{ name: 'Sueldo Líquido', value: 'sueldo_liquido', action: 'Calcular sueldo liquido' },
					{ name: 'Prima de Servicios', value: 'prima', action: 'Calcular prima' },
					{ name: 'Cesantías', value: 'cesantias', action: 'Calcular cesantias' },
					{ name: 'Liquidación', value: 'liquidacion', action: 'Calcular liquidacion' },
				],
				default: 'bruto_liquido',
			},
			// ===== PERU =====
			{
				displayName: 'Operación',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { pais: ['peru'] } },
				options: [
					{ name: 'Bruto desde Líquido', value: 'bruto_liquido', action: 'Calcular bruto desde liquido' },
					{ name: 'Sueldo Líquido', value: 'sueldo_liquido', action: 'Calcular sueldo liquido' },
					{ name: 'Gratificación', value: 'gratificacion', action: 'Calcular gratificacion' },
					{ name: 'CTS', value: 'cts', action: 'Calcular CTS' },
					{ name: 'Liquidación', value: 'liquidacion', action: 'Calcular liquidacion' },
				],
				default: 'bruto_liquido',
			},
			// ===== BRASIL =====
			{
				displayName: 'Operación',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { pais: ['brasil'] } },
				options: [
					{ name: 'Bruto desde Líquido', value: 'bruto_liquido', action: 'Calcular bruto desde liquido' },
					{ name: 'Salário Líquido', value: 'sueldo_liquido', action: 'Calcular salario liquido' },
					{ name: 'Férias', value: 'ferias', action: 'Calcular ferias' },
					{ name: '13° Salário', value: 'decimo_tercero', action: 'Calcular decimo terceiro' },
					{ name: 'Rescisão', value: 'rescisao', action: 'Calcular rescisao' },
				],
				default: 'bruto_liquido',
			},
			// ===== ECUADOR =====
			{
				displayName: 'Operación',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { pais: ['ecuador'] } },
				options: [
					{ name: 'Bruto desde Líquido', value: 'bruto_liquido', action: 'Calcular bruto desde liquido' },
					{ name: 'Sueldo Líquido', value: 'sueldo_liquido', action: 'Calcular sueldo liquido' },
					{ name: 'Décimo Tercero', value: 'decimo_tercero', action: 'Calcular decimo tercero' },
					{ name: 'Décimo Cuarto', value: 'decimo_cuarto', action: 'Calcular decimo cuarto' },
					{ name: 'Liquidación', value: 'liquidacion', action: 'Calcular liquidacion' },
				],
				default: 'bruto_liquido',
			},
			// ===== ESPAÑA =====
			{
				displayName: 'Operación',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { pais: ['espana'] } },
				options: [
					{ name: 'Bruto desde Líquido', value: 'bruto_liquido', action: 'Calcular bruto desde liquido' },
					{ name: 'Sueldo Líquido', value: 'sueldo_liquido', action: 'Calcular sueldo liquido' },
					{ name: 'Vacaciones', value: 'vacaciones', action: 'Calcular vacaciones' },
					{ name: 'Pagas Extras', value: 'pagas_extras', action: 'Calcular pagas extras' },
					{ name: 'Finiquito', value: 'finiquito', action: 'Calcular finiquito' },
				],
				default: 'bruto_liquido',
			},
			// ===== CAMPOS COMUNES =====
			{
				displayName: 'Sueldo Líquido Deseado',
				name: 'liquidoDeseado',
				type: 'number',
				default: 0,
				description: 'Sueldo líquido que desea pagar al empleado',
				displayOptions: {
					show: {
						operation: ['bruto_liquido'],
					},
				},
			},
			{
				displayName: 'Sueldo Bruto',
				name: 'sueldoBruto',
				type: 'number',
				default: 0,
				description: 'Sueldo bruto mensual',
				displayOptions: {
					show: {
						operation: ['sueldo_liquido', 'vacaciones', 'finiquito', 'aguinaldo', 'sac', 'indemnizacion', 'prima', 'cesantias', 'liquidacion', 'gratificacion', 'cts', 'ferias', 'decimo_tercero', 'rescisao', 'decimo_cuarto', 'pagas_extras'],
					},
				},
			},
			{
				displayName: 'Años de Antigüedad',
				name: 'anosAntiguedad',
				type: 'number',
				default: 1,
				displayOptions: {
					show: {
						operation: ['vacaciones', 'finiquito', 'indemnizacion', 'liquidacion'],
					},
				},
			},
			{
				displayName: 'Meses Trabajados',
				name: 'mesesTrabajados',
				type: 'number',
				default: 12,
				description: 'Meses trabajados en el período',
				displayOptions: {
					show: {
						operation: ['aguinaldo', 'sac', 'prima', 'gratificacion', 'cts', 'decimo_tercero', 'decimo_cuarto', 'pagas_extras', 'rescisao'],
					},
				},
			},
			{
				displayName: 'Días Vacaciones Pendientes',
				name: 'diasVacaciones',
				type: 'number',
				default: 0,
				displayOptions: {
					show: {
						operation: ['vacaciones', 'finiquito', 'indemnizacion'],
					},
				},
			},
			{
				displayName: 'Días Trabajados Último Año',
				name: 'diasTrabajados',
				type: 'number',
				default: 360,
				displayOptions: {
					show: {
						operation: ['cesantias', 'liquidacion'],
						pais: ['colombia'],
					},
				},
			},
			{
				displayName: 'Días del Mes Trabajado',
				name: 'diasMesTrabajado',
				type: 'number',
				default: 30,
				displayOptions: {
					show: {
						operation: ['finiquito'],
						pais: ['chile'],
					},
				},
			},
			// Chile específico - AFP Real
			{
				displayName: 'AFP',
				name: 'afpChile',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'AFP Modelo (10.58%)', value: 'modelo' },
					{ name: 'AFP Uno (10.49%)', value: 'uno' },
					{ name: 'AFP Habitat (11.27%)', value: 'habitat' },
					{ name: 'AFP PlanVital (11.16%)', value: 'planvital' },
					{ name: 'AFP Capital (11.44%)', value: 'capital' },
					{ name: 'AFP Cuprum (11.44%)', value: 'cuprum' },
					{ name: 'AFP ProVida (11.45%)', value: 'provida' },
				],
				default: 'modelo',
				description: 'AFP del trabajador (incluye cotización 10% + SIS 1.49% + comisión)',
				displayOptions: { show: { pais: ['chile'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Salud (%)',
				name: 'saludPct',
				type: 'number',
				default: 7,
				description: 'Fonasa 7% o Isapre (puede ser mayor)',
				displayOptions: { show: { pais: ['chile'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Días del Mes',
				name: 'diasMes',
				type: 'number',
				default: 30,
				description: 'Días totales del mes',
				displayOptions: { show: { pais: ['chile'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Días Trabajados',
				name: 'diasTrabajadosChile',
				type: 'number',
				default: 30,
				description: 'Días efectivamente trabajados (para cálculo proporcional)',
				displayOptions: { show: { pais: ['chile'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Bono Colación',
				name: 'bonoColacion',
				type: 'number',
				default: 0,
				description: 'Bono colación (no imponible)',
				displayOptions: { show: { pais: ['chile'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Bono Movilización',
				name: 'bonoMovilizacion',
				type: 'number',
				default: 0,
				description: 'Bono movilización (no imponible)',
				displayOptions: { show: { pais: ['chile'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Otros Bonos No Imponibles',
				name: 'otrosBonos',
				type: 'number',
				default: 0,
				description: 'Otros bonos no imponibles',
				displayOptions: { show: { pais: ['chile'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			// México específico
			{
				displayName: 'Zona Frontera Norte',
				name: 'zonaFrontera',
				type: 'boolean',
				default: false,
				description: 'Activar si el trabajador está en zona frontera norte (salario mínimo mayor)',
				displayOptions: { show: { pais: ['mexico'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Días del Mes',
				name: 'diasMesMexico',
				type: 'number',
				default: 30,
				description: 'Días totales del mes',
				displayOptions: { show: { pais: ['mexico'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Días Trabajados',
				name: 'diasTrabajadosMexico',
				type: 'number',
				default: 30,
				description: 'Días efectivamente trabajados (para cálculo proporcional)',
				displayOptions: { show: { pais: ['mexico'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Vales de Despensa',
				name: 'valesDespensa',
				type: 'number',
				default: 0,
				description: 'Vales de despensa (exento hasta 40% UMA)',
				displayOptions: { show: { pais: ['mexico'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Ayuda Transporte',
				name: 'ayudaTransporte',
				type: 'number',
				default: 0,
				description: 'Ayuda para transporte (no gravable)',
				displayOptions: { show: { pais: ['mexico'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Otros Bonos No Gravables',
				name: 'otrosBonosMexico',
				type: 'number',
				default: 0,
				description: 'Otros bonos no gravables',
				displayOptions: { show: { pais: ['mexico'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			// Argentina específico
			{
				displayName: 'Obra Social (%)',
				name: 'obraSocialPct',
				type: 'number',
				default: 3,
				description: 'Porcentaje obra social (varía según convenio)',
				displayOptions: { show: { pais: ['argentina'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Sindicato (%)',
				name: 'sindicatoPct',
				type: 'number',
				default: 2,
				description: 'Cuota sindical (0 si no está afiliado)',
				displayOptions: { show: { pais: ['argentina'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Días del Mes',
				name: 'diasMesArgentina',
				type: 'number',
				default: 30,
				description: 'Días totales del mes',
				displayOptions: { show: { pais: ['argentina'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Días Trabajados',
				name: 'diasTrabajadosArgentina',
				type: 'number',
				default: 30,
				description: 'Días efectivamente trabajados',
				displayOptions: { show: { pais: ['argentina'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Bono No Remunerativo',
				name: 'bonoNoRemunerativo',
				type: 'number',
				default: 0,
				description: 'Bonos no remunerativos (no aportan a jubilación)',
				displayOptions: { show: { pais: ['argentina'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Tiene Hijos a Cargo',
				name: 'tieneHijosArg',
				type: 'boolean',
				default: false,
				description: 'Para deducción de Ganancias',
				displayOptions: { show: { pais: ['argentina'], operation: ['sueldo_liquido'] } },
			},
			{
				displayName: 'Cantidad de Hijos',
				name: 'cantidadHijosArg',
				type: 'number',
				default: 0,
				description: 'Cantidad de hijos para deducción',
				displayOptions: { show: { pais: ['argentina'], operation: ['sueldo_liquido'] } },
			},
			// Colombia específico
			{
				displayName: 'Días del Mes',
				name: 'diasMesColombia',
				type: 'number',
				default: 30,
				description: 'Días totales del mes',
				displayOptions: { show: { pais: ['colombia'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Días Trabajados',
				name: 'diasTrabajadosColombia',
				type: 'number',
				default: 30,
				description: 'Días efectivamente trabajados',
				displayOptions: { show: { pais: ['colombia'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Incluir Auxilio de Transporte',
				name: 'incluyeAuxilioTransporte',
				type: 'boolean',
				default: true,
				description: 'Auxilio de transporte ($162,000 si salario <= 2 SMMLV)',
				displayOptions: { show: { pais: ['colombia'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Bonos No Salariales',
				name: 'bonosNoSalariales',
				type: 'number',
				default: 0,
				description: 'Bonos que no constituyen salario (ej: bonificaciones ocasionales)',
				displayOptions: { show: { pais: ['colombia'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			// Perú específico
			{
				displayName: 'Sistema de Pensiones',
				name: 'sistemaPension',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'AFP Habitat (1.47% comisión)', value: 'habitat' },
					{ name: 'AFP Integra (1.55% comisión)', value: 'integra' },
					{ name: 'AFP Prima (1.60% comisión)', value: 'prima' },
					{ name: 'AFP Profuturo (1.69% comisión)', value: 'profuturo' },
					{ name: 'ONP - Sistema Nacional (13%)', value: 'onp' },
				],
				default: 'habitat',
				description: 'AFP privada o ONP (sistema público)',
				displayOptions: { show: { pais: ['peru'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Días del Mes',
				name: 'diasMesPeru',
				type: 'number',
				default: 30,
				description: 'Días totales del mes',
				displayOptions: { show: { pais: ['peru'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Días Trabajados',
				name: 'diasTrabajadosPeru',
				type: 'number',
				default: 30,
				description: 'Días efectivamente trabajados',
				displayOptions: { show: { pais: ['peru'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Asignación Familiar',
				name: 'asignacionFamiliar',
				type: 'boolean',
				default: false,
				description: 'Aplica 10% de RMV adicional si tiene hijos menores',
				displayOptions: { show: { pais: ['peru'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Bonos No Afectos',
				name: 'bonosNoAfectos',
				type: 'number',
				default: 0,
				description: 'Bonos no afectos a aportes (ej: movilidad, alimentación)',
				displayOptions: { show: { pais: ['peru'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			// Brasil específico
			{
				displayName: 'Dias do Mês',
				name: 'diasMesBrasil',
				type: 'number',
				default: 30,
				description: 'Dias totais do mês',
				displayOptions: { show: { pais: ['brasil'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Dias Trabalhados',
				name: 'diasTrabalhadosBrasil',
				type: 'number',
				default: 30,
				description: 'Dias efetivamente trabalhados',
				displayOptions: { show: { pais: ['brasil'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Dependentes',
				name: 'dependentesBrasil',
				type: 'number',
				default: 0,
				description: 'Quantidade de dependentes para dedução IRRF',
				displayOptions: { show: { pais: ['brasil'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Opta por Vale Transporte',
				name: 'valeTransporte',
				type: 'boolean',
				default: false,
				description: 'Desconto de 6% se optar pelo VT',
				displayOptions: { show: { pais: ['brasil'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Vale Refeição',
				name: 'valeRefeicao',
				type: 'number',
				default: 0,
				description: 'Valor do vale refeição/alimentação',
				displayOptions: { show: { pais: ['brasil'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Outros Benefícios',
				name: 'outrosBeneficiosBrasil',
				type: 'number',
				default: 0,
				description: 'Outros benefícios não tributados',
				displayOptions: { show: { pais: ['brasil'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Saldo FGTS',
				name: 'saldoFgts',
				type: 'number',
				default: 0,
				displayOptions: { show: { pais: ['brasil'], operation: ['rescisao'] } },
			},
			{
				displayName: 'Demissão sem justa causa',
				name: 'semJustaCausa',
				type: 'boolean',
				default: true,
				displayOptions: { show: { pais: ['brasil'], operation: ['rescisao'] } },
			},
			// Ecuador específico
			{
				displayName: 'Días del Mes',
				name: 'diasMesEcuador',
				type: 'number',
				default: 30,
				description: 'Días totales del mes',
				displayOptions: { show: { pais: ['ecuador'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Días Trabajados',
				name: 'diasTrabajadosEcuador',
				type: 'number',
				default: 30,
				description: 'Días efectivamente trabajados',
				displayOptions: { show: { pais: ['ecuador'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Fondos de Reserva Mensualizados',
				name: 'fondosReserva',
				type: 'boolean',
				default: true,
				description: 'Si true, fondos de reserva se pagan mensual (8.33%)',
				displayOptions: { show: { pais: ['ecuador'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Bonos No Gravables',
				name: 'bonosNoGravablesEcuador',
				type: 'number',
				default: 0,
				description: 'Bonos exentos de impuestos',
				displayOptions: { show: { pais: ['ecuador'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			// España específico
			{
				displayName: 'Número de Pagas',
				name: 'pagas',
				type: 'options',
				options: [
					{ name: '12 pagas', value: 12 },
					{ name: '14 pagas', value: 14 },
				],
				default: 12,
				description: 'Número de pagas anuales',
				displayOptions: { show: { pais: ['espana'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Días del Mes',
				name: 'diasMesEspana',
				type: 'number',
				default: 30,
				description: 'Días totales del mes',
				displayOptions: { show: { pais: ['espana'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Días Trabajados',
				name: 'diasTrabajadosEspana',
				type: 'number',
				default: 30,
				description: 'Días efectivamente trabajados',
				displayOptions: { show: { pais: ['espana'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Tiene Hijos',
				name: 'tieneHijosEspana',
				type: 'boolean',
				default: false,
				description: 'Para reducción por mínimo familiar IRPF',
				displayOptions: { show: { pais: ['espana'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Número de Hijos',
				name: 'numHijosEspana',
				type: 'number',
				default: 0,
				description: 'Cantidad de hijos para deducción IRPF',
				displayOptions: { show: { pais: ['espana'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Ticket Restaurante',
				name: 'ticketRestaurante',
				type: 'number',
				default: 0,
				description: 'Ticket restaurante mensual (exento hasta 11€/día)',
				displayOptions: { show: { pais: ['espana'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Otros Beneficios',
				name: 'otrosBeneficiosEspana',
				type: 'number',
				default: 0,
				description: 'Otros beneficios sociales exentos',
				displayOptions: { show: { pais: ['espana'], operation: ['sueldo_liquido', 'bruto_liquido'] } },
			},
			{
				displayName: 'Sueldo Anual',
				name: 'sueldoAnual',
				type: 'number',
				default: 0,
				displayOptions: { show: { pais: ['espana'], operation: ['vacaciones', 'finiquito'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const pais = this.getNodeParameter('pais', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;
			let result: { [key: string]: any } = {};

			try {
				const sueldoBruto = this.getNodeParameter('sueldoBruto', i, 0) as number;
				const liquidoDeseado = this.getNodeParameter('liquidoDeseado', i, 0) as number;
				const anosAntiguedad = this.getNodeParameter('anosAntiguedad', i, 1) as number;
				const mesesTrabajados = this.getNodeParameter('mesesTrabajados', i, 12) as number;
				const diasVacaciones = this.getNodeParameter('diasVacaciones', i, 0) as number;

				// CHILE
				if (pais === 'chile') {
					if (operation === 'bruto_liquido') {
						const afpChile = this.getNodeParameter('afpChile', i, 'modelo') as string;
						const saludPct = this.getNodeParameter('saludPct', i, 7) as number;
						const diasMes = this.getNodeParameter('diasMes', i, 30) as number;
						const diasTrabajadosChile = this.getNodeParameter('diasTrabajadosChile', i, 30) as number;
						const bonoColacion = this.getNodeParameter('bonoColacion', i, 0) as number;
						const bonoMovilizacion = this.getNodeParameter('bonoMovilizacion', i, 0) as number;
						const otrosBonos = this.getNodeParameter('otrosBonos', i, 0) as number;
						result = chileCalcularBrutoDesdeLiquido(liquidoDeseado, afpChile, saludPct, 0.6, diasMes, diasTrabajadosChile, bonoColacion, bonoMovilizacion, otrosBonos);
					} else if (operation === 'sueldo_liquido') {
						const afpChile = this.getNodeParameter('afpChile', i, 'modelo') as string;
						const saludPct = this.getNodeParameter('saludPct', i, 7) as number;
						const diasMes = this.getNodeParameter('diasMes', i, 30) as number;
						const diasTrabajadosChile = this.getNodeParameter('diasTrabajadosChile', i, 30) as number;
						const bonoColacion = this.getNodeParameter('bonoColacion', i, 0) as number;
						const bonoMovilizacion = this.getNodeParameter('bonoMovilizacion', i, 0) as number;
						const otrosBonos = this.getNodeParameter('otrosBonos', i, 0) as number;
						result = chileCalcularSueldoLiquido(sueldoBruto, afpChile, saludPct, 0.6, diasMes, diasTrabajadosChile, bonoColacion, bonoMovilizacion, otrosBonos);
					} else if (operation === 'vacaciones') {
						result = chileCalcularVacaciones(sueldoBruto, diasVacaciones);
					} else if (operation === 'finiquito') {
						const diasMes = this.getNodeParameter('diasMesTrabajado', i, 30) as number;
						result = chileCalcularFiniquito(sueldoBruto, anosAntiguedad, diasVacaciones, diasMes);
					}
				}
				
				// MEXICO
				else if (pais === 'mexico') {
					if (operation === 'bruto_liquido') {
						const zonaFrontera = this.getNodeParameter('zonaFrontera', i, false) as boolean;
						const diasMesMexico = this.getNodeParameter('diasMesMexico', i, 30) as number;
						const diasTrabajadosMexico = this.getNodeParameter('diasTrabajadosMexico', i, 30) as number;
						const valesDespensa = this.getNodeParameter('valesDespensa', i, 0) as number;
						const ayudaTransporte = this.getNodeParameter('ayudaTransporte', i, 0) as number;
						const otrosBonosMexico = this.getNodeParameter('otrosBonosMexico', i, 0) as number;
						result = mexicoCalcularBrutoDesdeLiquido(liquidoDeseado, zonaFrontera, diasMesMexico, diasTrabajadosMexico, valesDespensa, ayudaTransporte, otrosBonosMexico);
					} else if (operation === 'sueldo_liquido') {
						const zonaFrontera = this.getNodeParameter('zonaFrontera', i, false) as boolean;
						const diasMesMexico = this.getNodeParameter('diasMesMexico', i, 30) as number;
						const diasTrabajadosMexico = this.getNodeParameter('diasTrabajadosMexico', i, 30) as number;
						const valesDespensa = this.getNodeParameter('valesDespensa', i, 0) as number;
						const ayudaTransporte = this.getNodeParameter('ayudaTransporte', i, 0) as number;
						const otrosBonosMexico = this.getNodeParameter('otrosBonosMexico', i, 0) as number;
						result = mexicoCalcularSueldoLiquido(sueldoBruto, zonaFrontera, diasMesMexico, diasTrabajadosMexico, valesDespensa, ayudaTransporte, otrosBonosMexico);
					} else if (operation === 'vacaciones') {
						result = mexicoCalcularVacaciones(sueldoBruto, anosAntiguedad);
					} else if (operation === 'aguinaldo') {
						result = mexicoCalcularAguinaldo(sueldoBruto, mesesTrabajados);
					} else if (operation === 'finiquito') {
						result = mexicoCalcularFiniquito(sueldoBruto, anosAntiguedad, diasVacaciones);
					}
				}
				
				// ARGENTINA
				else if (pais === 'argentina') {
					if (operation === 'bruto_liquido') {
						const obraSocialPct = this.getNodeParameter('obraSocialPct', i, 3) as number;
						const sindicatoPct = this.getNodeParameter('sindicatoPct', i, 2) as number;
						const diasMesArgentina = this.getNodeParameter('diasMesArgentina', i, 30) as number;
						const diasTrabajadosArgentina = this.getNodeParameter('diasTrabajadosArgentina', i, 30) as number;
						const bonoNoRemunerativo = this.getNodeParameter('bonoNoRemunerativo', i, 0) as number;
						result = argentinaCalcularBrutoDesdeLiquido(liquidoDeseado, obraSocialPct, sindicatoPct, diasMesArgentina, diasTrabajadosArgentina, bonoNoRemunerativo);
					} else if (operation === 'sueldo_liquido') {
						const obraSocialPct = this.getNodeParameter('obraSocialPct', i, 3) as number;
						const sindicatoPct = this.getNodeParameter('sindicatoPct', i, 2) as number;
						const diasMesArgentina = this.getNodeParameter('diasMesArgentina', i, 30) as number;
						const diasTrabajadosArgentina = this.getNodeParameter('diasTrabajadosArgentina', i, 30) as number;
						const bonoNoRemunerativo = this.getNodeParameter('bonoNoRemunerativo', i, 0) as number;
						const tieneHijosArg = this.getNodeParameter('tieneHijosArg', i, false) as boolean;
						const cantidadHijosArg = this.getNodeParameter('cantidadHijosArg', i, 0) as number;
						result = argentinaCalcularSueldoLiquido(sueldoBruto, obraSocialPct, sindicatoPct, diasMesArgentina, diasTrabajadosArgentina, bonoNoRemunerativo, tieneHijosArg, cantidadHijosArg);
					} else if (operation === 'vacaciones') {
						result = argentinaCalcularVacaciones(sueldoBruto, anosAntiguedad);
					} else if (operation === 'sac') {
						result = argentinaCalcularSAC(sueldoBruto, mesesTrabajados);
					} else if (operation === 'indemnizacion') {
						result = argentinaCalcularIndemnizacion(sueldoBruto, anosAntiguedad, diasVacaciones);
					}
				}
				
				// COLOMBIA
				else if (pais === 'colombia') {
					if (operation === 'bruto_liquido') {
						const diasMesColombia = this.getNodeParameter('diasMesColombia', i, 30) as number;
						const diasTrabajadosColombia = this.getNodeParameter('diasTrabajadosColombia', i, 30) as number;
						const incluyeAuxilioTransporte = this.getNodeParameter('incluyeAuxilioTransporte', i, true) as boolean;
						const bonosNoSalariales = this.getNodeParameter('bonosNoSalariales', i, 0) as number;
						result = colombiaCalcularBrutoDesdeLiquido(liquidoDeseado, diasMesColombia, diasTrabajadosColombia, incluyeAuxilioTransporte, bonosNoSalariales);
					} else if (operation === 'sueldo_liquido') {
						const diasMesColombia = this.getNodeParameter('diasMesColombia', i, 30) as number;
						const diasTrabajadosColombia = this.getNodeParameter('diasTrabajadosColombia', i, 30) as number;
						const incluyeAuxilioTransporte = this.getNodeParameter('incluyeAuxilioTransporte', i, true) as boolean;
						const bonosNoSalariales = this.getNodeParameter('bonosNoSalariales', i, 0) as number;
						result = colombiaCalcularSueldoLiquido(sueldoBruto, diasMesColombia, diasTrabajadosColombia, incluyeAuxilioTransporte, bonosNoSalariales);
					} else if (operation === 'prima') {
						result = colombiaCalcularPrima(sueldoBruto, mesesTrabajados);
					} else if (operation === 'cesantias') {
						const diasTrabajados = this.getNodeParameter('diasTrabajados', i, 360) as number;
						result = colombiaCalcularCesantias(sueldoBruto, diasTrabajados);
					} else if (operation === 'liquidacion') {
						const diasTrabajados = this.getNodeParameter('diasTrabajados', i, 360) as number;
						result = colombiaCalcularLiquidacion(sueldoBruto, anosAntiguedad, diasTrabajados);
					}
				}
				
				// PERU
				else if (pais === 'peru') {
					if (operation === 'bruto_liquido') {
						const sistemaPension = this.getNodeParameter('sistemaPension', i, 'habitat') as string;
						const diasMesPeru = this.getNodeParameter('diasMesPeru', i, 30) as number;
						const diasTrabajadosPeru = this.getNodeParameter('diasTrabajadosPeru', i, 30) as number;
						const asignacionFamiliar = this.getNodeParameter('asignacionFamiliar', i, false) as boolean;
						const bonosNoAfectos = this.getNodeParameter('bonosNoAfectos', i, 0) as number;
						result = peruCalcularBrutoDesdeLiquido(liquidoDeseado, sistemaPension, diasMesPeru, diasTrabajadosPeru, asignacionFamiliar, bonosNoAfectos);
					} else if (operation === 'sueldo_liquido') {
						const sistemaPension = this.getNodeParameter('sistemaPension', i, 'habitat') as string;
						const diasMesPeru = this.getNodeParameter('diasMesPeru', i, 30) as number;
						const diasTrabajadosPeru = this.getNodeParameter('diasTrabajadosPeru', i, 30) as number;
						const asignacionFamiliar = this.getNodeParameter('asignacionFamiliar', i, false) as boolean;
						const bonosNoAfectos = this.getNodeParameter('bonosNoAfectos', i, 0) as number;
						result = peruCalcularSueldoLiquido(sueldoBruto, sistemaPension, diasMesPeru, diasTrabajadosPeru, asignacionFamiliar, bonosNoAfectos);
					} else if (operation === 'gratificacion') {
						result = peruCalcularGratificacion(sueldoBruto, mesesTrabajados);
					} else if (operation === 'cts') {
						result = peruCalcularCTS(sueldoBruto, mesesTrabajados);
					} else if (operation === 'liquidacion') {
						result = peruCalcularLiquidacion(sueldoBruto, anosAntiguedad, mesesTrabajados);
					}
				}
				
				// BRASIL
				else if (pais === 'brasil') {
					if (operation === 'bruto_liquido') {
						const diasMesBrasil = this.getNodeParameter('diasMesBrasil', i, 30) as number;
						const diasTrabalhadosBrasil = this.getNodeParameter('diasTrabalhadosBrasil', i, 30) as number;
						const dependentesBrasil = this.getNodeParameter('dependentesBrasil', i, 0) as number;
						const valeTransporte = this.getNodeParameter('valeTransporte', i, false) as boolean;
						const valeRefeicao = this.getNodeParameter('valeRefeicao', i, 0) as number;
						const outrosBeneficiosBrasil = this.getNodeParameter('outrosBeneficiosBrasil', i, 0) as number;
						result = brasilCalcularBrutoDesdeLiquido(liquidoDeseado, diasMesBrasil, diasTrabalhadosBrasil, dependentesBrasil, valeTransporte, valeRefeicao, outrosBeneficiosBrasil);
					} else if (operation === 'sueldo_liquido') {
						const diasMesBrasil = this.getNodeParameter('diasMesBrasil', i, 30) as number;
						const diasTrabalhadosBrasil = this.getNodeParameter('diasTrabalhadosBrasil', i, 30) as number;
						const dependentesBrasil = this.getNodeParameter('dependentesBrasil', i, 0) as number;
						const valeTransporte = this.getNodeParameter('valeTransporte', i, false) as boolean;
						const valeRefeicao = this.getNodeParameter('valeRefeicao', i, 0) as number;
						const outrosBeneficiosBrasil = this.getNodeParameter('outrosBeneficiosBrasil', i, 0) as number;
						result = brasilCalcularSueldoLiquido(sueldoBruto, diasMesBrasil, diasTrabalhadosBrasil, dependentesBrasil, valeTransporte, valeRefeicao, outrosBeneficiosBrasil);
					} else if (operation === 'ferias') {
						result = brasilCalcularFerias(sueldoBruto);
					} else if (operation === 'decimo_tercero') {
						result = brasilCalcularDecimoTerceiro(sueldoBruto, mesesTrabajados);
					} else if (operation === 'rescisao') {
						const saldoFgts = this.getNodeParameter('saldoFgts', i, 0) as number;
						const semJustaCausa = this.getNodeParameter('semJustaCausa', i, true) as boolean;
						result = brasilCalcularRescisao(sueldoBruto, mesesTrabajados, saldoFgts, semJustaCausa);
					}
				}
				
				// ECUADOR
				else if (pais === 'ecuador') {
					if (operation === 'bruto_liquido') {
						const diasMesEcuador = this.getNodeParameter('diasMesEcuador', i, 30) as number;
						const diasTrabajadosEcuador = this.getNodeParameter('diasTrabajadosEcuador', i, 30) as number;
						const fondosReserva = this.getNodeParameter('fondosReserva', i, true) as boolean;
						const bonosNoGravablesEcuador = this.getNodeParameter('bonosNoGravablesEcuador', i, 0) as number;
						result = ecuadorCalcularBrutoDesdeLiquido(liquidoDeseado, diasMesEcuador, diasTrabajadosEcuador, fondosReserva, bonosNoGravablesEcuador);
					} else if (operation === 'sueldo_liquido') {
						const diasMesEcuador = this.getNodeParameter('diasMesEcuador', i, 30) as number;
						const diasTrabajadosEcuador = this.getNodeParameter('diasTrabajadosEcuador', i, 30) as number;
						const fondosReserva = this.getNodeParameter('fondosReserva', i, true) as boolean;
						const bonosNoGravablesEcuador = this.getNodeParameter('bonosNoGravablesEcuador', i, 0) as number;
						result = ecuadorCalcularSueldoLiquido(sueldoBruto, diasMesEcuador, diasTrabajadosEcuador, fondosReserva, bonosNoGravablesEcuador);
					} else if (operation === 'decimo_tercero') {
						result = ecuadorCalcularDecimoTercero(sueldoBruto, mesesTrabajados);
					} else if (operation === 'decimo_cuarto') {
						result = ecuadorCalcularDecimoCuarto(460, mesesTrabajados);
					} else if (operation === 'liquidacion') {
						result = ecuadorCalcularLiquidacion(sueldoBruto, anosAntiguedad, mesesTrabajados);
					}
				}
				
				// ESPAÑA
				else if (pais === 'espana') {
					if (operation === 'bruto_liquido') {
						const pagas = this.getNodeParameter('pagas', i, 12) as number;
						const diasMesEspana = this.getNodeParameter('diasMesEspana', i, 30) as number;
						const diasTrabajadosEspana = this.getNodeParameter('diasTrabajadosEspana', i, 30) as number;
						const tieneHijosEspana = this.getNodeParameter('tieneHijosEspana', i, false) as boolean;
						const numHijosEspana = this.getNodeParameter('numHijosEspana', i, 0) as number;
						const ticketRestaurante = this.getNodeParameter('ticketRestaurante', i, 0) as number;
						const otrosBeneficiosEspana = this.getNodeParameter('otrosBeneficiosEspana', i, 0) as number;
						result = espanaCalcularBrutoDesdeLiquido(liquidoDeseado, pagas, diasMesEspana, diasTrabajadosEspana, tieneHijosEspana, numHijosEspana, ticketRestaurante, otrosBeneficiosEspana);
					} else if (operation === 'sueldo_liquido') {
						const pagas = this.getNodeParameter('pagas', i, 12) as number;
						const diasMesEspana = this.getNodeParameter('diasMesEspana', i, 30) as number;
						const diasTrabajadosEspana = this.getNodeParameter('diasTrabajadosEspana', i, 30) as number;
						const tieneHijosEspana = this.getNodeParameter('tieneHijosEspana', i, false) as boolean;
						const numHijosEspana = this.getNodeParameter('numHijosEspana', i, 0) as number;
						const ticketRestaurante = this.getNodeParameter('ticketRestaurante', i, 0) as number;
						const otrosBeneficiosEspana = this.getNodeParameter('otrosBeneficiosEspana', i, 0) as number;
						result = espanaCalcularSueldoLiquido(sueldoBruto, pagas, diasMesEspana, diasTrabajadosEspana, tieneHijosEspana, numHijosEspana, ticketRestaurante, otrosBeneficiosEspana);
					} else if (operation === 'vacaciones') {
						const sueldoAnual = this.getNodeParameter('sueldoAnual', i, 0) as number;
						result = espanaCalcularVacaciones(sueldoAnual, diasVacaciones);
					} else if (operation === 'pagas_extras') {
						result = espanaCalcularPagasExtras(sueldoBruto, mesesTrabajados);
					} else if (operation === 'finiquito') {
						const sueldoAnual = this.getNodeParameter('sueldoAnual', i, 0) as number;
						result = espanaCalcularFiniquito(sueldoAnual, anosAntiguedad, diasVacaciones);
					}
				}

				returnData.push({ json: result });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
