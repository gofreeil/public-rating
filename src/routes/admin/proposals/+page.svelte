<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { PROPOSAL_STATUSES, proposalStatusLabel, type CivicProposal } from '$lib/rating/types';
	import { absDate } from '$lib/rating/time';

	let { data, form } = $props();

	const inputCls =
		'bg-[#1e293b] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors';

	// עריכה במקום
	let editingId = $state<string | null>(null);
	let editStatus = $state('discussion');
	let editOfficialIds = $state('');
	let editUpdate = $state('');

	function startEdit(p: CivicProposal) {
		editingId = p.id;
		editStatus = p.status;
		editOfficialIds = p.official_ids.join(', ');
		editUpdate = '';
	}

	/** שם מדורג לפי מזהה — להצגה ידידותית של הקישורים */
	function officialName(id: string): string {
		return data.officials.find((o) => o.id === id)?.name ?? id;
	}
</script>

<svelte:head>
	<title>ניהול הצעות — דירוג ציבורי</title>
	<meta name="description" content="ניהול מרחב ההצעות האזרחיות — אישור, סטטוס וקישור מדורגים" />
</svelte:head>

<div class="min-h-screen bg-[#070b14] text-white" dir="rtl">
	<div class="max-w-6xl mx-auto px-4 py-8">

		<!-- כותרת -->
		<div class="flex items-center justify-between gap-3 flex-wrap mb-6">
			<div>
				<h1 class="text-3xl font-black">📜 ניהול הצעות</h1>
				<p class="text-gray-400 mt-1">אישור הצעות, עדכון סטטוס וקישור מדורגים</p>
			</div>
			<button
				onclick={() => goto('/admin')}
				class="px-4 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
			>
				← לוח ניהול
			</button>
		</div>

		<!-- הודעת הצלחה/שגיאה -->
		{#if form?.success}
			<div class="mb-6 rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-3 text-center">
				<p class="text-green-400 text-sm font-medium">{form.message}</p>
			</div>
		{/if}
		{#if form?.error}
			<div class="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-center">
				<p class="text-red-400 text-sm font-medium">{form.error}</p>
			</div>
		{/if}

		<!-- א) הצעות ממתינות -->
		<section class="mb-6">
			<h2 class="font-bold mb-3">⏳ ממתינות לאישור ({data.pending?.length ?? 0})</h2>
			<div class="space-y-2">
				{#each data.pending ?? [] as p (p.id)}
					<div class="bg-slate-800/80 border border-amber-500/20 rounded-2xl px-4 py-3">
						<div class="flex flex-wrap items-center gap-3">
							<div class="flex-1 min-w-[200px]">
								<a href="/proposals/{p.id}" class="font-bold hover:text-blue-300 transition-colors">{p.title}</a>
								<div class="text-xs text-gray-400 mt-0.5">
									{p.anonymous ? 'אנונימי' : p.proposer_name} · {absDate(p.created_at)}
								</div>
							</div>
							<div class="flex gap-2">
								<form method="POST" action="?/approve" use:enhance>
									<input type="hidden" name="id" value={p.id} />
									<button
										type="submit"
										class="px-3 py-1.5 text-xs rounded-lg bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-all cursor-pointer"
									>
										✅ אישור
									</button>
								</form>
								<form method="POST" action="?/reject" use:enhance>
									<input type="hidden" name="id" value={p.id} />
									<button
										type="submit"
										onclick={(e) => { if (!confirm(`לדחות את "${p.title}"?`)) e.preventDefault(); }}
										class="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all cursor-pointer"
									>
										🗑️ דחייה
									</button>
								</form>
							</div>
						</div>
						<p class="text-sm text-gray-300 mt-2 line-clamp-2">{p.text}</p>
					</div>
				{:else}
					<div class="text-gray-500 text-sm bg-slate-800/80 border border-white/10 rounded-2xl px-4 py-3">
						אין הצעות ממתינות
					</div>
				{/each}
			</div>
		</section>

		<!-- ב) הצעות מפורסמות -->
		<section>
			<h2 class="font-bold mb-3">📋 במרחב הציבורי ({data.proposals?.length ?? 0})</h2>
			<div class="space-y-2">
				{#each data.proposals ?? [] as p (p.id)}
					{@const status = proposalStatusLabel(p.status)}
					<div class="bg-slate-800/80 border border-white/10 rounded-2xl px-4 py-2.5">
						<div class="flex flex-wrap items-center gap-3">
							<div class="flex-1 min-w-[200px]">
								<a href="/proposals/{p.id}" class="font-bold hover:text-blue-300 transition-colors">{p.title}</a>
								<div class="text-xs text-gray-400 mt-0.5">
									{p.anonymous ? 'אנונימי' : p.proposer_name} · {absDate(p.created_at)}
								</div>
							</div>
							<span class="text-xs px-2 py-0.5 rounded-full bg-slate-800/80 border border-white/10 text-gray-300 whitespace-nowrap">
								{status.icon} {status.label}
							</span>
							<span class="text-xs text-purple-300 whitespace-nowrap">🤝 {p.supporters.length}</span>
							{#if p.official_ids.length}
								<span class="text-xs text-gray-400 whitespace-nowrap" title={p.official_ids.map((id) => officialName(id)).join(', ')}>
									🗳️ {p.official_ids.length} מקושרים
								</span>
							{/if}
							<div class="flex gap-2">
								<button
									onclick={() => (editingId === p.id ? (editingId = null) : startEdit(p))}
									class="px-3 py-1.5 text-xs rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-all cursor-pointer"
								>
									✏️ עריכה
								</button>
								<form method="POST" action="?/remove" use:enhance>
									<input type="hidden" name="id" value={p.id} />
									<button
										type="submit"
										onclick={(e) => { if (!confirm(`להסיר את "${p.title}" מהמרחב?`)) e.preventDefault(); }}
										class="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all cursor-pointer"
									>
										🗑️ הסרה
									</button>
								</form>
							</div>
						</div>

						{#if editingId === p.id}
							<form
								method="POST"
								action="?/update"
								use:enhance={() => async ({ result, update }) => {
									if (result.type === 'success') editingId = null;
									await update();
								}}
								class="flex flex-wrap gap-2 items-center mt-3 pt-3 border-t border-white/10"
							>
								<input type="hidden" name="id" value={p.id} />
								<select name="status" bind:value={editStatus} class="{inputCls} cursor-pointer">
									{#each PROPOSAL_STATUSES as s (s.key)}
										<option value={s.key}>{s.icon} {s.label}</option>
									{/each}
								</select>
								<input
									name="official_ids"
									bind:value={editOfficialIds}
									dir="ltr"
									list="officials-list"
									placeholder="מזהי מדורגים מקושרים, מופרדים בפסיק"
									title="documentId של כל מדורג קשור — הרשימה הנפתחת מציעה לפי שם"
									class="{inputCls} flex-1 min-w-[240px]"
								/>
								<input
									name="add_update"
									bind:value={editUpdate}
									placeholder="עדכון חדש לציר הזמן (אופציונלי)"
									class="{inputCls} flex-1 min-w-[220px]"
								/>
								<button
									type="submit"
									class="px-4 py-2 text-sm font-bold rounded-xl bg-gradient-to-l from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all cursor-pointer"
								>
									שמירה
								</button>
								<button
									type="button"
									onclick={() => (editingId = null)}
									class="px-4 py-2 text-sm rounded-xl bg-slate-800/80 border border-white/10 text-gray-300 hover:bg-white/10 transition-all cursor-pointer"
								>
									ביטול
								</button>
							</form>
						{/if}
					</div>
				{:else}
					<div class="text-gray-500 text-sm bg-slate-800/80 border border-white/10 rounded-2xl px-4 py-3">
						אין הצעות במרחב עדיין
					</div>
				{/each}
			</div>
		</section>
	</div>
</div>

<!-- רשימת מדורגים לבחירה מהירה של מזהים -->
<datalist id="officials-list">
	{#each data.officials as o (o.id)}
		<option value={o.id}>{o.name}{o.position ? ` — ${o.position}` : ''}</option>
	{/each}
</datalist>
