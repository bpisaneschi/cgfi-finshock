<script setup lang="ts">
import { onMounted, watch, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useLabels } from '@/lib/labels'
import { useStore, scenarios } from '@/store/store'

const $l = useLabels()
const store = useStore()

const route = useRoute()

onMounted(async () => {})

const controlsRef = ref<HTMLElement | null>(null)

watch(
	() => [store.selectedLiability],
	() => {
		if (store.selectedLiability) {
			const el = document.getElementById(
				`owes${store.selectedLiability.to + 1}`,
			) as HTMLInputElement
			el.focus()
		}
	},
)

watch(
	() => store.selectedScenario,
	() => {
		store.selectScenario(store.selectedScenario)
	},
)
</script>

<template>
	<div
		ref="controlsRef"
		class="controls"
		:class="{ disabled: store.animating }"
	>
		<div class="scenarios">
			<select class="ui" id="scenario" v-model="store.selectedScenario">
				<option v-for="(scenario, id) in scenarios" :key="id" :value="id">
					{{ scenario.name }}
				</option>
			</select>
			<button @click="store.importData" class="import">Import data</button>
			<button @click="store.randomise" class="randomise">
				Randomise network
			</button>
		</div>
		<div class="control">
			<label for="node">{{ $l.selNode }}</label>
			<select class="ui" id="node" v-model="store.selectedNode">
				<option v-for="i in store.nNodes" :key="i" :value="i - 1">
					{{
						store.nodeIds !== null && store.nodeIds[i - 1]
							? store.nodeIds[i - 1]
							: i - 1
					}}
				</option>
			</select>
			<button class="addremove" @click="store.addNode">+</button>
			<button class="addremove" @click="store.removeNode">-</button>
		</div>
		<div class="control info">
			<label>
				{{ $l.equityIs }}:
				{{
					store.equityOuts.length > store.modelI
						? store.equityOuts[store.modelI][store.selectedNode].toFixed(2)
						: 'N/A'
				}}
			</label>
			<label>
				{{ $l.valueIs }}:
				{{
					store.effectiveValues.length > store.modelI
						? store.effectiveValues[store.modelI][store.selectedNode].toFixed(3)
						: 'N/A'
				}}
			</label>
		</div>
		<div class="spacer"></div>
		<div class="control" id="shockControl">
			<label for="shock">{{ $l.shock }}</label>
			<input
				class="ui"
				id="shock"
				type="number"
				step="10"
				v-model="store.shock[store.selectedNode]"
			/>
		</div>
		<div class="control">
			<label for="extAsset">{{ $l.extAsset }}</label>
			<input
				class="ui"
				id="extAsset"
				type="number"
				min="0"
				step="10"
				v-model="store.extAssets[store.selectedNode]"
			/>
		</div>
		<div class="control">
			<label for="extLiability">{{ $l.extLiability }}</label>
			<input
				class="ui"
				id="extLiability"
				type="number"
				min="0"
				step="10"
				v-model="store.extLiabilities[store.selectedNode]"
			/>
		</div>
		<div class="spacer" />
		<div id="valuation">
			<div class="control">
				<label for="valueFunc">{{ $l.valueFunc }}</label>
				<select class="ui" id="valueFunc" v-model="store.valueFunc">
					<option value="Distress">Distress</option>
					<option value="Merton">Merton</option>
					<option value="Black">Black</option>
				</select>
			</div>
			<div class="control">
				<label for="recoveryRate">{{ $l.recoveryRate }}</label>
				<input
					class="ui"
					id="recoveryRate"
					type="number"
					min="0"
					max="1"
					step="0.1"
					v-model="store.R"
				/>
			</div>
			<div class="control" v-show="store.valueFunc === 'Distress'">
				<label for="alpha">{{ $l.alphabeta }}</label>
				<input
					class="ui lmat"
					id="alpha"
					type="number"
					min="0"
					max="1"
					step="0.1"
					v-model="store.alpha"
				/>
				<input
					class="ui lmat"
					id="beta"
					type="number"
					min="0"
					max="1"
					step="0.1"
					v-model="store.beta"
				/>
			</div>
			<div class="control" v-show="store.valueFunc !== 'Distress'">
				<label for="volatility">{{ $l.volatility }}</label>
				<input
					class="ui"
					id="volatility"
					type="number"
					min="0"
					max="1"
					step="0.1"
					v-model="store.volatility"
				/>
			</div>
			<div class="control" v-show="store.valueFunc !== 'Distress'">
				<label for="maturity">{{ $l.maturity }}</label>
				<input
					class="ui"
					id="maturity"
					type="number"
					min="0"
					max="50"
					step="1"
					v-model="store.maturity"
				/>
			</div>
		</div>
		<div class="spacer"></div>
		<div class="control">
			<label> </label>
			<label class="Ltitle"> Owes</label>
			<label class="Ltitle"> Owed by</label>
		</div>
		<div id="liabilityMatrix">
			<div
				class="control"
				v-for="i in store.nNodes"
				:key="i"
				v-show="i - 1 != store.selectedNode"
			>
				<label :for="'owes' + i">{{
					store.nodeIds !== null && store.nodeIds[i - 1]
						? store.nodeIds[i - 1]
						: i - 1
				}}</label>
				<input
					class="ui lmat"
					:id="'owes' + i"
					type="number"
					min="0"
					step="10"
					v-model="store.liabilityMatrix[store.selectedNode][i - 1]"
					@focus="
						store.selectedLiability = { from: store.selectedNode, to: i - 1 }
					"
					@blur="
						() => {
							store.selectedLiability = null
						}
					"
				/>
				<input
					class="ui lmat"
					:id="'owed' + i"
					type="number"
					min="0"
					step="10"
					v-model="store.liabilityMatrix[i - 1][store.selectedNode]"
					@focus="
						store.selectedLiability = { to: store.selectedNode, from: i - 1 }
					"
					@blur="
						() => {
							store.selectedLiability = null
						}
					"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@import '@/assets/styles/scssVars.scss';

.controls {
	display: flex;
	flex-direction: column;
	overflow-y: scroll;
	margin: 0.5rem;

	#node {
		margin-bottom: 0;
	}

	&.disabled {
		pointer-events: none;
		opacity: 0.7;
	}

	.control {
		align-items: center;
		display: flex;
		flex-direction: row;
		justify-content: space-around;

		label {
			flex: 1 0 7rem;
			text-align: right;
			padding-right: 1rem;
			color: $primary;
			&.Ltitle {
				flex: 1 0 30%;
				text-align: center;
			}
		}

		&.info {
			margin: 0.5rem 0;
			label {
				flex: 1 1 10%;
				text-align: center;
				margin: 0.25rem;
				font-size: 1.2rem;
				color: $textColor;
			}
		}

		.ui {
			flex: 1 1 70%;
			min-width: 0;

			&.lmat:last-child {
				margin-left: 1rem;
			}

			&.lmat {
				flex: 1 1 35%;
			}
		}
	}

	.spacer {
		flex: 0 0 1rem;
	}

	button.addremove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: none;
		border-radius: 3px;
		background-color: $buttonColor;
		color: $textColor;
		font-size: 1.5rem;
		cursor: pointer;
		transition: background-color 0.3s ease;
		margin: 0.1rem;
	}

	.import {
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: 0.5rem;
		background-color: $buttonColor;
		color: $textColor;
		font-size: 1rem;
		cursor: pointer;
		transition: background-color 0.3s ease;
		&:hover {
			background-color: darken($buttonColor, 10%);
		}
	}
}
</style>
