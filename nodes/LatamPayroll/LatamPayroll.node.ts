import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

// ==================== CHILE ====================
function chileCalcularSueldoLiquido(bruto: number, afpPct: number = 10.77, saludPct: number = 7, cesantiaPct: number = 0.6): object {
	const afp = Math.round(bruto * afpPct / 100);
	const salud = Math.round(bruto * saludPct / 100);
	const cesantia = Math.round(bruto * cesantiaPct / 100);
	const totalDescuentos = afp + salud + cesantia;
	const liquido = bruto - totalDescuentos;
	
	return {
		pais: 'Chile',
		sueldoBruto: bruto,
		descuentos: {
			afp: { porcentaje: afpPct, monto: afp },
			salud: { porcentaje: saludPct, monto: salud },
			cesantia: { porcentaje: cesantiaPct, monto: cesantia },
			total: totalDescuentos,
		},
		sueldoLiquido: liquido,
	};
}

function chileCalcularBrutoDesdeLiquido(liquidoDeseado: number, afpPct: number = 10.77, saludPct: number = 7, cesantiaPct: number = 0.6): object {
	// Fórmula inversa: Bruto = Líquido / (1 - totalDescuentos%)
	const totalDescuentosPct = (afpPct + saludPct + cesantiaPct) / 100;
	const bruto = Math.round(liquidoDeseado / (1 - totalDescuentosPct));
	
	const afp = Math.round(bruto * afpPct / 100);
	const salud = Math.round(bruto * saludPct / 100);
	const cesantia = Math.round(bruto * cesantiaPct / 100);
	const totalDescuentos = afp + salud + cesantia;
	const liquidoReal = bruto - totalDescuentos;
	
	return {
		pais: 'Chile',
		liquidoDeseado,
		sueldoBrutoNecesario: bruto,
		descuentos: {
			afp: { porcentaje: afpPct, monto: afp },
			salud: { porcentaje: saludPct, monto: salud },
			cesantia: { porcentaje: cesantiaPct, monto: cesantia },
			total: totalDescuentos,
		},
		liquidoResultante: liquidoReal,
		costoEmpresa: bruto,
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

// ==================== MEXICO ====================
function mexicoCalcularSueldoLiquido(bruto: number, imss: number = 2.775): object {
	const descuentoImss = Math.round(bruto * imss / 100);
	// ISR simplificado (tabla 2024 aproximada)
	let isr = 0;
	if (bruto > 10298.35) isr = Math.round((bruto - 10298.35) * 0.16);
	else if (bruto > 8601.50) isr = Math.round((bruto - 8601.50) * 0.1088);
	else if (bruto > 7399.42) isr = Math.round((bruto - 7399.42) * 0.064);
	
	const totalDescuentos = descuentoImss + isr;
	const liquido = bruto - totalDescuentos;
	
	return {
		pais: 'México',
		sueldoBruto: bruto,
		descuentos: {
			imss: { porcentaje: imss, monto: descuentoImss },
			isr: { monto: isr, nota: 'Cálculo simplificado' },
			total: totalDescuentos,
		},
		sueldoLiquido: liquido,
	};
}

function mexicoCalcularBrutoDesdeLiquido(liquidoDeseado: number, imss: number = 2.775): object {
	// Aproximación iterativa por la complejidad del ISR
	let bruto = liquidoDeseado * 1.15; // Estimación inicial
	for (let i = 0; i < 10; i++) {
		const resultado = mexicoCalcularSueldoLiquido(bruto, imss) as any;
		const diferencia = liquidoDeseado - resultado.sueldoLiquido;
		bruto = bruto + diferencia;
	}
	bruto = Math.round(bruto);
	const final = mexicoCalcularSueldoLiquido(bruto, imss) as any;
	
	return {
		pais: 'México',
		liquidoDeseado,
		sueldoBrutoNecesario: bruto,
		descuentos: final.descuentos,
		liquidoResultante: final.sueldoLiquido,
		costoEmpresa: bruto,
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

// ==================== ARGENTINA ====================
function argentinaCalcularSueldoLiquido(bruto: number): object {
	const jubilacion = Math.round(bruto * 11 / 100);
	const obraSocial = Math.round(bruto * 3 / 100);
	const ley19032 = Math.round(bruto * 3 / 100); // PAMI
	const totalDescuentos = jubilacion + obraSocial + ley19032;
	const liquido = bruto - totalDescuentos;
	
	return {
		pais: 'Argentina',
		sueldoBruto: bruto,
		descuentos: {
			jubilacion: { porcentaje: 11, monto: jubilacion },
			obraSocial: { porcentaje: 3, monto: obraSocial },
			ley19032Pami: { porcentaje: 3, monto: ley19032 },
			total: totalDescuentos,
		},
		sueldoLiquido: liquido,
	};
}

function argentinaCalcularBrutoDesdeLiquido(liquidoDeseado: number): object {
	// Descuentos fijos: 11% + 3% + 3% = 17%
	const bruto = Math.round(liquidoDeseado / (1 - 0.17));
	const jubilacion = Math.round(bruto * 11 / 100);
	const obraSocial = Math.round(bruto * 3 / 100);
	const ley19032 = Math.round(bruto * 3 / 100);
	const totalDescuentos = jubilacion + obraSocial + ley19032;
	const liquidoReal = bruto - totalDescuentos;
	
	return {
		pais: 'Argentina',
		liquidoDeseado,
		sueldoBrutoNecesario: bruto,
		descuentos: {
			jubilacion: { porcentaje: 11, monto: jubilacion },
			obraSocial: { porcentaje: 3, monto: obraSocial },
			ley19032Pami: { porcentaje: 3, monto: ley19032 },
			total: totalDescuentos,
		},
		liquidoResultante: liquidoReal,
		costoEmpresa: bruto,
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

// ==================== COLOMBIA ====================
function colombiaCalcularSueldoLiquido(bruto: number): object {
	const pension = Math.round(bruto * 4 / 100);
	const salud = Math.round(bruto * 4 / 100);
	const totalDescuentos = pension + salud;
	const liquido = bruto - totalDescuentos;
	
	return {
		pais: 'Colombia',
		sueldoBruto: bruto,
		descuentos: {
			pension: { porcentaje: 4, monto: pension },
			salud: { porcentaje: 4, monto: salud },
			total: totalDescuentos,
		},
		sueldoLiquido: liquido,
		nota: 'Empleador aporta adicional 12% pensión y 8.5% salud',
	};
}

function colombiaCalcularBrutoDesdeLiquido(liquidoDeseado: number): object {
	// Descuentos fijos: 4% + 4% = 8%
	const bruto = Math.round(liquidoDeseado / (1 - 0.08));
	const pension = Math.round(bruto * 4 / 100);
	const salud = Math.round(bruto * 4 / 100);
	const totalDescuentos = pension + salud;
	const liquidoReal = bruto - totalDescuentos;
	
	return {
		pais: 'Colombia',
		liquidoDeseado,
		sueldoBrutoNecesario: bruto,
		descuentos: {
			pension: { porcentaje: 4, monto: pension },
			salud: { porcentaje: 4, monto: salud },
			total: totalDescuentos,
		},
		liquidoResultante: liquidoReal,
		costoEmpresa: bruto,
		nota: 'Costo empresa total = Bruto + 12% pensión + 8.5% salud + parafiscales',
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

// ==================== PERU ====================
function peruCalcularSueldoLiquido(bruto: number, afpPct: number = 10): object {
	const afp = Math.round(bruto * afpPct / 100);
	const comisionAfp = Math.round(bruto * 1.69 / 100);
	const seguroAfp = Math.round(bruto * 1.36 / 100);
	const totalDescuentos = afp + comisionAfp + seguroAfp;
	const liquido = bruto - totalDescuentos;
	
	return {
		pais: 'Perú',
		sueldoBruto: bruto,
		descuentos: {
			afp: { porcentaje: afpPct, monto: afp },
			comisionAfp: { porcentaje: 1.69, monto: comisionAfp },
			seguroAfp: { porcentaje: 1.36, monto: seguroAfp },
			total: totalDescuentos,
		},
		sueldoLiquido: liquido,
		nota: 'EsSalud (9%) lo paga el empleador',
	};
}

function peruCalcularBrutoDesdeLiquido(liquidoDeseado: number, afpPct: number = 10): object {
	// Descuentos: AFP + comisión 1.69% + seguro 1.36%
	const totalPct = (afpPct + 1.69 + 1.36) / 100;
	const bruto = Math.round(liquidoDeseado / (1 - totalPct));
	const afp = Math.round(bruto * afpPct / 100);
	const comisionAfp = Math.round(bruto * 1.69 / 100);
	const seguroAfp = Math.round(bruto * 1.36 / 100);
	const totalDescuentos = afp + comisionAfp + seguroAfp;
	const liquidoReal = bruto - totalDescuentos;
	
	return {
		pais: 'Perú',
		liquidoDeseado,
		sueldoBrutoNecesario: bruto,
		descuentos: {
			afp: { porcentaje: afpPct, monto: afp },
			comisionAfp: { porcentaje: 1.69, monto: comisionAfp },
			seguroAfp: { porcentaje: 1.36, monto: seguroAfp },
			total: totalDescuentos,
		},
		liquidoResultante: liquidoReal,
		costoEmpresa: Math.round(bruto * 1.09), // +9% EsSalud
		nota: 'Costo empresa incluye 9% EsSalud',
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

// ==================== BRASIL ====================
function brasilCalcularSueldoLiquido(bruto: number): object {
	// INSS 2024 (tabela progressiva)
	let inss = 0;
	if (bruto <= 1412.00) inss = bruto * 0.075;
	else if (bruto <= 2666.68) inss = 105.90 + (bruto - 1412.00) * 0.09;
	else if (bruto <= 4000.03) inss = 218.81 + (bruto - 2666.68) * 0.12;
	else if (bruto <= 7786.02) inss = 378.81 + (bruto - 4000.03) * 0.14;
	else inss = 908.85; // Teto
	
	inss = Math.round(inss);
	const baseIrrf = bruto - inss;
	
	// IRRF simplificado
	let irrf = 0;
	if (baseIrrf > 4664.68) irrf = Math.round((baseIrrf - 4664.68) * 0.275);
	else if (baseIrrf > 3751.05) irrf = Math.round((baseIrrf - 3751.05) * 0.225);
	else if (baseIrrf > 2826.65) irrf = Math.round((baseIrrf - 2826.65) * 0.15);
	else if (baseIrrf > 2259.20) irrf = Math.round((baseIrrf - 2259.20) * 0.075);
	
	const liquido = bruto - inss - irrf;
	
	return {
		pais: 'Brasil',
		salarioBruto: bruto,
		descontos: {
			inss: { monto: inss, nota: 'Tabela progressiva 2024' },
			irrf: { monto: irrf, nota: 'Cálculo simplificado' },
			total: inss + irrf,
		},
		salarioLiquido: liquido,
	};
}

function brasilCalcularBrutoDesdeLiquido(liquidoDeseado: number): object {
	// Aproximación iterativa por la complejidad de INSS e IRRF progresivos
	let bruto = liquidoDeseado * 1.25; // Estimación inicial
	for (let i = 0; i < 10; i++) {
		const resultado = brasilCalcularSueldoLiquido(bruto) as any;
		const diferencia = liquidoDeseado - resultado.salarioLiquido;
		bruto = bruto + diferencia;
	}
	bruto = Math.round(bruto);
	const final = brasilCalcularSueldoLiquido(bruto) as any;
	
	return {
		pais: 'Brasil',
		liquidoDesejado: liquidoDeseado,
		salarioBrutoNecessario: bruto,
		descontos: final.descontos,
		liquidoResultante: final.salarioLiquido,
		custoEmpresa: Math.round(bruto * 1.08), // +8% FGTS aprox
		nota: 'Custo empresa inclui ~8% FGTS',
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

// ==================== ECUADOR ====================
function ecuadorCalcularSueldoLiquido(bruto: number): object {
	const iess = Math.round(bruto * 9.45 / 100);
	const liquido = bruto - iess;
	
	return {
		pais: 'Ecuador',
		sueldoBruto: bruto,
		descuentos: {
			iess: { porcentaje: 9.45, monto: iess },
			total: iess,
		},
		sueldoLiquido: liquido,
		nota: 'Empleador aporta 11.15% adicional',
	};
}

function ecuadorCalcularBrutoDesdeLiquido(liquidoDeseado: number): object {
	// Descuento IESS: 9.45%
	const bruto = Math.round(liquidoDeseado / (1 - 0.0945));
	const iess = Math.round(bruto * 9.45 / 100);
	const liquidoReal = bruto - iess;
	
	return {
		pais: 'Ecuador',
		liquidoDeseado,
		sueldoBrutoNecesario: bruto,
		descuentos: {
			iess: { porcentaje: 9.45, monto: iess },
			total: iess,
		},
		liquidoResultante: liquidoReal,
		costoEmpresa: Math.round(bruto * 1.1115), // +11.15% IESS patronal
		nota: 'Costo empresa incluye 11.15% IESS patronal',
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

// ==================== ESPAÑA ====================
function espanaCalcularSueldoLiquido(bruto: number, irpfPct: number = 15): object {
	const ss = Math.round(bruto * 6.35 / 100);
	const desempleo = Math.round(bruto * 1.55 / 100);
	const formacion = Math.round(bruto * 0.10 / 100);
	const irpf = Math.round(bruto * irpfPct / 100);
	const totalDescuentos = ss + desempleo + formacion + irpf;
	const liquido = bruto - totalDescuentos;
	
	return {
		pais: 'España',
		sueldoBruto: bruto,
		descuentos: {
			seguridadSocial: { porcentaje: 6.35, monto: ss },
			desempleo: { porcentaje: 1.55, monto: desempleo },
			formacion: { porcentaje: 0.10, monto: formacion },
			irpf: { porcentaje: irpfPct, monto: irpf },
			total: totalDescuentos,
		},
		sueldoLiquido: liquido,
	};
}

function espanaCalcularBrutoDesdeLiquido(liquidoDeseado: number, irpfPct: number = 15): object {
	// Descuentos: SS 6.35% + Desempleo 1.55% + Formación 0.10% + IRPF variable
	const totalPct = (6.35 + 1.55 + 0.10 + irpfPct) / 100;
	const bruto = Math.round(liquidoDeseado / (1 - totalPct));
	
	const ss = Math.round(bruto * 6.35 / 100);
	const desempleo = Math.round(bruto * 1.55 / 100);
	const formacion = Math.round(bruto * 0.10 / 100);
	const irpf = Math.round(bruto * irpfPct / 100);
	const totalDescuentos = ss + desempleo + formacion + irpf;
	const liquidoReal = bruto - totalDescuentos;
	
	return {
		pais: 'España',
		liquidoDeseado,
		sueldoBrutoNecesario: bruto,
		descuentos: {
			seguridadSocial: { porcentaje: 6.35, monto: ss },
			desempleo: { porcentaje: 1.55, monto: desempleo },
			formacion: { porcentaje: 0.10, monto: formacion },
			irpf: { porcentaje: irpfPct, monto: irpf },
			total: totalDescuentos,
		},
		liquidoResultante: liquidoReal,
		costoEmpresa: Math.round(bruto * 1.30), // ~30% cargas sociales empresa
		nota: 'Costo empresa incluye ~30% Seguridad Social empresa',
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
			// Chile específico
			{
				displayName: 'AFP (%)',
				name: 'afpPct',
				type: 'number',
				default: 10.77,
				displayOptions: { show: { pais: ['chile'], operation: ['sueldo_liquido'] } },
			},
			{
				displayName: 'Salud (%)',
				name: 'saludPct',
				type: 'number',
				default: 7,
				displayOptions: { show: { pais: ['chile'], operation: ['sueldo_liquido'] } },
			},
			// Brasil específico
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
			// España específico
			{
				displayName: 'IRPF (%)',
				name: 'irpfPct',
				type: 'number',
				default: 15,
				displayOptions: { show: { pais: ['espana'], operation: ['sueldo_liquido'] } },
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
						const afpPct = this.getNodeParameter('afpPct', i, 10.77) as number;
						const saludPct = this.getNodeParameter('saludPct', i, 7) as number;
						result = chileCalcularBrutoDesdeLiquido(liquidoDeseado, afpPct, saludPct);
					} else if (operation === 'sueldo_liquido') {
						const afpPct = this.getNodeParameter('afpPct', i, 10.77) as number;
						const saludPct = this.getNodeParameter('saludPct', i, 7) as number;
						result = chileCalcularSueldoLiquido(sueldoBruto, afpPct, saludPct);
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
						result = mexicoCalcularBrutoDesdeLiquido(liquidoDeseado);
					} else if (operation === 'sueldo_liquido') {
						result = mexicoCalcularSueldoLiquido(sueldoBruto);
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
						result = argentinaCalcularBrutoDesdeLiquido(liquidoDeseado);
					} else if (operation === 'sueldo_liquido') {
						result = argentinaCalcularSueldoLiquido(sueldoBruto);
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
						result = colombiaCalcularBrutoDesdeLiquido(liquidoDeseado);
					} else if (operation === 'sueldo_liquido') {
						result = colombiaCalcularSueldoLiquido(sueldoBruto);
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
						result = peruCalcularBrutoDesdeLiquido(liquidoDeseado);
					} else if (operation === 'sueldo_liquido') {
						result = peruCalcularSueldoLiquido(sueldoBruto);
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
						result = brasilCalcularBrutoDesdeLiquido(liquidoDeseado);
					} else if (operation === 'sueldo_liquido') {
						result = brasilCalcularSueldoLiquido(sueldoBruto);
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
						result = ecuadorCalcularBrutoDesdeLiquido(liquidoDeseado);
					} else if (operation === 'sueldo_liquido') {
						result = ecuadorCalcularSueldoLiquido(sueldoBruto);
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
						const irpfPct = this.getNodeParameter('irpfPct', i, 15) as number;
						result = espanaCalcularBrutoDesdeLiquido(liquidoDeseado, irpfPct);
					} else if (operation === 'sueldo_liquido') {
						const irpfPct = this.getNodeParameter('irpfPct', i, 15) as number;
						result = espanaCalcularSueldoLiquido(sueldoBruto, irpfPct);
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
