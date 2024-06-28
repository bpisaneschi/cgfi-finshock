// Required packages (need to be installed separately in Node.js environment)
// import jStat from 'jstat'
import { beta, normal } from 'jstat'

// Helper function for matrix sum along rows
function rowSum(matrix: number[][], i: number): number {
	let sum: number = 0
	for (let j = 0; j < matrix[i].length; j++) {
		sum += matrix[i][j]
	}
	return sum
}

// Helper function for matrix sum along rows
function colSum(matrix: number[][], j: number): number {
	let sum: number = 0
	for (let i = 0; i < matrix.length; i++) {
		sum += matrix[i][j]
	}
	return sum
}

// Helper function for element-wise operations
function elementWiseOperation(
	array: number[],
	callback: (val: number, i: number) => number,
) {
	return array.map(callback)
}

function IntVal(
	L: number[][],
	EL: number[],
	OE: number[],
	k: number[],
	R: number,
	a: number,
	b: number,
) {
	let Frac = elementWiseOperation(
		OE,
		(val, i) => 1 + val / (rowSum(L, i) + EL[i]),
	)
	Frac = Frac.map((val) => (isFinite(val) ? val : 0))
	Frac = Frac.map((val) => (isNaN(val) ? 0 : val))

	return Frac.map((frac, i) => {
		if (k[i] === 0) {
			return frac >= 1 ? 1 : 0
		} else {
			return (
				(frac >= 1 + k[i] ? 1 : 0) +
				(frac >= 1 && frac < 1 + k[i]
					? 1 - R * beta.cdf((1 + k[i] - frac) / k[i], a, b)
					: 0)
			)
		}
	})
}

function Merton(
	Ae: number[],
	OE2: number[],
	R: number,
	vol: number,
	maturity: number,
) {
	let lev = OE2.map((val, i) => val / Ae[i])

	let vals = lev.map((lev) => {
		return lev >= 1
			? 1
			: normal.cdf(
					(Math.log(1 / (1 - lev)) - (Math.pow(vol, 2) * maturity) / 2) /
						(vol * Math.sqrt(maturity)),
					0,
					1,
				)
	})

	const ret = vals.map((val) => 1 - R * (1 - val))
	return ret
}

function BlackCox(
	ExtA: number[],
	OE2: number[],
	R: number,
	vol: number,
	maturity: number,
) {
	let Lev = OE2.map((val, i) => val / ExtA[i])
	let Val = Lev.map((lev) => {
		if (lev >= 1) return 1
		if (lev >= 0 && lev < 1) {
			let part1 = normal.cdf(
				(Math.log(1 / (1 - lev)) - (Math.pow(vol, 2) * maturity) / 2) /
					(vol * Math.sqrt(maturity)),
				0,
				1,
			)
			let part2 =
				(1 / (1 - lev)) *
				normal.cdf(
					(-Math.log(1 / (1 - lev)) - Math.pow(vol, 2) * maturity) /
						(vol * Math.sqrt(maturity)),
					0,
					1,
				)
			return part1 - part2
		}
		return 0
	})

	return Val.map((val) => 1 - R * (1 - val))
}

// Main function
function iterateModel(
	Ae: number[],
	X: number[],
	L: number[][],
	Le: number[],
	R: number,
	k: number[],
	a: number,
	b: number,
	EVol: number,
	Type: string,
	Time: number,
) {
	/*
	 * Ae: External assets
	 * X: Shock
	 * L: Liabilities matrix
	 * Le: External liabilities
	 */
	const eqVals = []
	const effectiveAssetVals = []
	let E = Ae.map((val, i) => val + colSum(L, i) - rowSum(L, i) - Le[i])

	// eqVals stores the successive steps in the model run.
	// So we push E(0) to eqVals
	eqVals.push([...E])
	effectiveAssetVals.push(new Array(L.length).fill(1))

	// Now calculate E(1) and push it to eqVals
	E = Ae.map((val, i) => val - X[i] + colSum(L, i) - rowSum(L, i) - Le[i])

	eqVals.push([...E])

	let iteration = 0
	const max_iterations = 5000
	let OE = new Array(E.length).fill(1e9)
	let OIntVal: number[]

	// Now we iterate until convergence or max_iterations
	// Each time step we re-assess the relative values of the nodes
	// This valuation provides the basis for reassesssing the equity values of each node
	while (
		!E.every((val, i) => Math.abs(val - OE[i]) < 1e-6) &&
		iteration < max_iterations
	) {
		OE = [...E]
		if (Type === 'Distress') {
			OIntVal = IntVal(L, Le, OE, k, R, a, b)
		} else if (Type === 'Merton') {
			OIntVal = Merton(Ae, OE, R, EVol, Time)
		} else if (Type === 'Black') {
			OIntVal = BlackCox(Ae, OE, R, EVol, Time)
		} else {
			throw new Error('Unknown Type specified.')
		}
		effectiveAssetVals.push([...OIntVal])

		// The definition of the new value for equity is:
		//
		// External assets - external liabilities
		// Plus assets from other nodes (liabilities in the L-matrix), multiplied by the effective value of that node
		// Minus the liabilities to other nodes.

		// 		let result = 0;
		// for (const { a, b } of array) {
		//    result += a + b;
		// }
		// return result;
		E = new Array(E.length)
		for (let i = 0; i < E.length; i++) {
			let effLSum = 0
			let intASum = 0
			for (let j = 0; j < L.length; j++) {
				effLSum += L[j][i] * OIntVal[j]
				intASum += L[i][j]
			}
			E[i] = Ae[i] - X[i] + effLSum - intASum - Le[i]
		}
		// E = Ae.map(
		// 	(val, i) =>
		// 		val -
		// 		X[i] +
		// 		LT[i].reduce((sum, val, j) => sum + val * OIntVal[j], 0) -
		// 		rowSum(L,i) -
		// 		Le[i],
		// )
		// console.log(E, E1)
		eqVals.push([...E])
		iteration++
	}
	// Once more, so we can save the final effective asset values
	OE = [...E]
	if (Type === 'Distress') {
		OIntVal = IntVal(L, Le, OE, k, R, a, b)
	} else if (Type === 'Merton') {
		OIntVal = Merton(Ae, OE, R, EVol, Time)
	} else if (Type === 'Black') {
		OIntVal = BlackCox(Ae, OE, R, EVol, Time)
	} else {
		throw new Error('Unknown Type specified.')
	}
	effectiveAssetVals.push([...OIntVal])

	if (iteration >= max_iterations) {
		console.warn('Maximum iterations reached without convergence.')
	}

	return { eqVals, effectiveAssetVals }
}

export function getEquities(
	extAssets: number[],
	extLiabilities: number[],
	liabilityMatrix: number[][],
) {
	return extAssets.map(
		(val, i) =>
			val +
			colSum(liabilityMatrix, i) -
			rowSum(liabilityMatrix, i) -
			extLiabilities[i],
	)
}

export function runModel(
	extAssets: number[],
	extLiabilities: number[],
	liabilityMatrix: number[][],
	shock: number[],
	type = 'Distress',
	R = 1,
	a = 1,
	b = 1,
	eVol = 0.5,
	time = 5,
) {
	// Initial equity
	const E0 = getEquities(extAssets, extLiabilities, liabilityMatrix)
	const k0 = E0.map(
		(val, i) => val / (rowSum(liabilityMatrix, i) + extLiabilities[i]),
	) // capital cushion (distress function)

	return iterateModel(
		extAssets,
		shock,
		liabilityMatrix,
		extLiabilities,
		R,
		k0,
		a,
		b,
		eVol,
		type,
		time,
	)
}