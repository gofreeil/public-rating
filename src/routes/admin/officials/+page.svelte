<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { GROUPS, PROMISE_STATUSES, groupByKey, type GroupKey, type RatedOfficial } from '$lib/rating/types';
	import { heMatches } from '$lib/rating/heSearch';
	import { fmtScore } from '$lib/rating/aggregate';
	import { absDate } from '$lib/rating/time';
	import Avatar from '$lib/components/rating/Avatar.svelte';

	let { data, form } = $props();

	// סנכרון חיצוני — ריצה ארוכה (עד דקה), לכן מצב "מסנכרן..." על הכפתור
	let syncing = $state(false);
	let fetchingRecords = $state(false);
	let showSyncDetails = $state(false);
	/** id המדורג שהרזומה שלו נמשכת כרגע (כפתור השורה) */
	let recordingId = $state<string | null>(null);

	const inputCls =
		'bg-[#1e293b] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors';

	// טופס הוספה — הקבוצה קובעת את רשימת התפקידים המוצעים
	let newGroup = $state<GroupKey>('knesset');

	// חיפוש ברשימת המדורגים
	let searchQuery = $state('');
	const filteredOfficials = $derived(
		(data.officials ?? []).filter((o) => heMatches(searchQuery, o.name, o.position, o.org))
	);

	// עריכה במקום
	let editingId = $state<string | null>(null);
	let editName = $state('');
	let editPosition = $state('');
	let editOrg = $state('');
	let editBio = $state('');
	let editImage = $state('');
	// שדות הפרופיל המלא
	let editVerified = $state(false);
	let editEmail = $state('');
	let editPhone = $state('');
	let editWhatsapp = $state('');
	let editFacebook = $state('');
	let editWebsite = $state('');
	let editPlatformUrl = $state('');
	let editReportUrl = $state('');
	let editSpecialties = $state('');
	let editPromises = $state('');
	let editAttendance = $state('');

	/** הבטחות → שורות טופס: "טקסט | סטטוס" (בלי סטטוס כשטרם נבחנה) */
	function promisesToLines(o: RatedOfficial): string {
		return o.promises
			.map((p) => {
				const label = PROMISE_STATUSES.find((s) => s.key === p.status)?.label ?? '';
				return p.status === 'unknown' ? p.text : `${p.text} | ${label}`;
			})
			.join('\n');
	}

	function startEdit(o: RatedOfficial) {
		editingId = o.id;
		editName = o.name;
		editPosition = o.position;
		editOrg = o.org;
		editBio = o.bio;
		editImage = o.image;
		editVerified = o.verified;
		editEmail = o.contacts.email;
		editPhone = o.contacts.phone;
		editWhatsapp = o.contacts.whatsapp;
		editFacebook = o.contacts.facebook;
		editWebsite = o.contacts.website;
		editPlatformUrl = o.platform_url;
		editReportUrl = o.annual_report_url;
		editSpecialties = o.specialties.join(', ');
		editPromises = promisesToLines(o);
		editAttendance = o.attendance_score === null ? '' : String(o.attendance_score);
	}
</script>

<svelte:head>
	<title>ניהול מדורגים — דירוג ציבורי</title>
	<meta name="description" content="ניהול המדורגים בפלטפורמת הדירוג הציבורי — הוספה, אישור הצעות משתמשים ועריכה" />
</svelte:head>

<div class="min-h-screen bg-[#070b14] text-white" dir="rtl">
	<div class="max-w-6xl mx-auto px-4 py-8">

		<!-- כותרת -->
		<div class="flex items-center justify-between gap-3 flex-wrap mb-6">
			<div>
				<h1 class="text-3xl font-black">🗳️ ניהול מדורגים</h1>
				<p class="text-gray-400 mt-1">הוספה, אישור הצעות ועריכת נבחרי ועובדי ציבור</p>
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

		<!-- 🔄 סנכרון נתונים חיצוני (כנסת + שקוף) -->
		<section class="bg-slate-800/80 border border-white/10 rounded-2xl p-4 mb-6">
			<div class="flex flex-wrap items-center gap-3">
				<div class="flex-1 min-w-[240px]">
					<h2 class="font-bold">🔄 סנכרון נתונים חיצוני</h2>
					<p class="text-xs text-gray-400 mt-1 leading-relaxed">
						מצבת חברי הכנסת והשרים המכהנים מה-OData הרשמי של הכנסת + מדד המיניסטרמטר של
						"שקוף". מוסיף חדשים, מעדכן תפקיד/סיעה ומדווח על מי שכבר לא מכהן — בלי לדרוס
						שדות שמולאו ידנית ובלי למחוק אף אחד.
					</p>
					{#if data.syncLog}
						<p class="text-xs text-gray-500 mt-1.5">
							סנכרון אחרון: {absDate(data.syncLog.ran_at)}
							{#if data.syncLog.ran_by}· ע"י {data.syncLog.ran_by}{/if}
							· {data.syncLog.roster_count} מכהנים
						</p>
					{/if}
				</div>
				<div class="flex flex-wrap gap-2">
					<form
						method="POST"
						action="?/sync"
						use:enhance={() => {
							syncing = true;
							return async ({ update }) => {
								syncing = false;
								showSyncDetails = true;
								await update();
							};
						}}
					>
						<button
							type="submit"
							disabled={syncing || fetchingRecords}
							class="px-5 py-2 text-sm font-bold rounded-xl bg-gradient-to-l from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
						>
							{syncing ? '⏳ מסנכרן... (עד דקה)' : '🔄 מצבת מכהנים + שקוף'}
						</button>
					</form>
					<form
						method="POST"
						action="?/records"
						use:enhance={() => {
							fetchingRecords = true;
							return async ({ update }) => {
								fetchingRecords = false;
								await update();
							};
						}}
					>
						<button
							type="submit"
							disabled={syncing || fetchingRecords}
							title="רזומה פרלמנטרית לכל מכהן: חקיקה, שאילתות, ציר תפקידים. רץ במנות — לוחצים שוב עד שנגמר"
							class="px-5 py-2 text-sm font-bold rounded-xl bg-slate-800/80 border border-white/10 text-gray-200 hover:bg-white/10 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
						>
							{fetchingRecords ? '⏳ מושך רזומות...' : '📜 משיכת רזומות'}
						</button>
					</form>
				</div>
			</div>

			{#if data.recordLog}
				<p class="text-xs text-gray-500 mt-2">
					רזומות: עדכון אחרון {absDate(data.recordLog.ran_at)} · {data.recordLog.done} נמשכו
					{#if data.recordLog.remaining}· נותרו {data.recordLog.remaining}{:else}· הושלם{/if}
					{#if data.recordLog.errors.length}· {data.recordLog.errors.length} שגיאות{/if}
				</p>
			{/if}

			{#if data.syncLog && (data.syncLog.added.length || data.syncLog.updated.length || data.syncLog.departed.length || data.syncLog.shakuf_applied.length || data.syncLog.errors.length)}
				<button
					type="button"
					onclick={() => (showSyncDetails = !showSyncDetails)}
					class="mt-3 text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
				>
					{showSyncDetails ? '▲ הסתרת פירוט' : '▼ פירוט הסנכרון האחרון'}
				</button>
				{#if showSyncDetails}
					<div class="mt-2 flex flex-col gap-1.5 text-xs leading-relaxed border-t border-white/10 pt-3">
						{#if data.syncLog.added.length}
							<p><span class="font-bold text-green-400">✚ נוספו ({data.syncLog.added.length}):</span>
								<span class="text-gray-300">{data.syncLog.added.join(', ')}</span></p>
						{/if}
						{#if data.syncLog.updated.length}
							<p><span class="font-bold text-blue-400">✎ עודכנו ({data.syncLog.updated.length}):</span>
								<span class="text-gray-300">{data.syncLog.updated.join(', ')}</span></p>
						{/if}
						{#if data.syncLog.shakuf_applied.length}
							<p><span class="font-bold text-purple-400">📊 מדד שקוף ({data.syncLog.shakuf_applied.length}):</span>
								<span class="text-gray-300">{data.syncLog.shakuf_applied.join(' · ')}</span></p>
						{/if}
						{#if data.syncLog.departed.length}
							<p><span class="font-bold text-amber-400">🚪 לא ברשימת המכהנים ({data.syncLog.departed.length}):</span>
								<span class="text-gray-300">{data.syncLog.departed.join(', ')}</span>
								<span class="text-gray-500">— לא הוסרו; אם פרשו, הסירו ידנית מהרשימה למטה</span></p>
						{/if}
						{#if data.syncLog.errors.length}
							<p><span class="font-bold text-red-400">⚠ שגיאות ({data.syncLog.errors.length}):</span>
								<span class="text-gray-300">{data.syncLog.errors.join(' · ')}</span></p>
						{/if}
					</div>
				{/if}
			{/if}
		</section>

		<!-- א) הוספת מדורג -->
		<section class="bg-slate-800/80 border border-white/10 rounded-2xl p-4 mb-6">
			<h2 class="font-bold mb-3">➕ הוספת מדורג</h2>
			<form method="POST" action="?/create" use:enhance class="flex flex-wrap gap-2 items-center">
				<select name="group" bind:value={newGroup} class="{inputCls} cursor-pointer">
					{#each GROUPS as g (g.key)}
						<option value={g.key}>{g.icon} {g.title}</option>
					{/each}
				</select>
				<input name="name" required placeholder="שם מלא *" class="{inputCls} flex-1 min-w-[140px]" />
				<input name="position" list={'positions-' + newGroup} placeholder="תפקיד" class="{inputCls} w-40" />
				<input name="org" placeholder={groupByKey(newGroup)?.orgLabel ?? 'ארגון'} class="{inputCls} w-40" />
				<input name="bio" placeholder="רקע קצר" class="{inputCls} flex-1 min-w-[160px]" />
				<input name="image" type="url" dir="ltr" placeholder="קישור לתמונה (URL)" class="{inputCls} flex-1 min-w-[180px]" />
				<button
					type="submit"
					class="px-5 py-2 text-sm font-bold rounded-xl bg-gradient-to-l from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all cursor-pointer"
				>
					הוספה
				</button>
			</form>
		</section>

		<!-- ב) הצעות ממתינות -->
		<section class="mb-6">
			<h2 class="font-bold mb-3">⏳ הצעות ממתינות ({data.pending?.length ?? 0})</h2>
			<div class="space-y-2">
				{#each data.pending ?? [] as p (p.id)}
					<div class="bg-slate-800/80 border border-amber-500/20 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
						<span class="text-lg" title={groupByKey(p.group)?.title}>{groupByKey(p.group)?.icon}</span>
						<div class="flex-1 min-w-[160px]">
							<div class="font-bold">{p.name}</div>
							<div class="text-xs text-gray-400 truncate">{[p.position, p.org].filter(Boolean).join(' · ')}</div>
						</div>
						{#if p.suggested_by}
							<span class="text-xs text-gray-500 whitespace-nowrap">הוצע ע"י: {p.suggested_by}</span>
						{/if}
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
									class="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all cursor-pointer"
								>
									🗑️ דחייה
								</button>
							</form>
						</div>
					</div>
				{:else}
					<div class="text-gray-500 text-sm bg-slate-800/80 border border-white/10 rounded-2xl px-4 py-3">
						אין הצעות ממתינות
					</div>
				{/each}
			</div>
		</section>

		<!-- ג) כל המדורגים -->
		<section>
			<div class="flex items-center justify-between gap-3 flex-wrap mb-3">
				<h2 class="font-bold">📋 כל המדורגים ({filteredOfficials.length})</h2>
				<input type="text" placeholder="חיפוש..." bind:value={searchQuery} class="{inputCls} w-48" />
			</div>
			<div class="space-y-2">
				{#each filteredOfficials as o (o.id)}
					<div class="bg-slate-800/80 border border-white/10 rounded-2xl px-4 py-2.5">
						<div class="flex flex-wrap items-center gap-3">
							<Avatar name={o.name} image={o.image} size={32} />
							<span class="font-bold">{o.name}</span>
							<span title={groupByKey(o.group)?.title}>{groupByKey(o.group)?.icon}</span>
							<span class="text-xs text-gray-400 flex-1 min-w-[120px] truncate">
								{[o.position, o.org].filter(Boolean).join(' · ')}
							</span>
							<span class="text-xs text-amber-300 whitespace-nowrap">
								⭐ {fmtScore(o.stats.average)} ({o.stats.count})
							</span>
							<div class="flex gap-2">
								{#if o.group === 'knesset'}
									<form
										method="POST"
										action="?/record"
										use:enhance={() => {
											recordingId = o.id;
											return async ({ update }) => {
												recordingId = null;
												await update();
											};
										}}
									>
										<input type="hidden" name="id" value={o.id} />
										<button
											type="submit"
											disabled={recordingId === o.id}
											title={o.knesset_record
												? `רזומה מעודכנת ל-${absDate(o.knesset_record.synced_at)} — לחיצה תרענן`
												: 'משיכת הרזומה הפרלמנטרית מה-OData של הכנסת'}
											class="px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer disabled:cursor-wait {o.knesset_record
												? 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20'
												: 'bg-slate-800/80 text-gray-400 border-white/10 hover:bg-white/10'}"
										>
											{recordingId === o.id ? '⏳' : '📜'} רזומה
										</button>
									</form>
								{/if}
								<button
									onclick={() => (editingId === o.id ? (editingId = null) : startEdit(o))}
									class="px-3 py-1.5 text-xs rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-all cursor-pointer"
								>
									✏️ עריכה
								</button>
								<form method="POST" action="?/remove" use:enhance>
									<input type="hidden" name="id" value={o.id} />
									<button
										type="submit"
										onclick={(e) => { if (!confirm(`להסיר את "${o.name}" מהלוח?`)) e.preventDefault(); }}
										class="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all cursor-pointer"
									>
										🗑️ הסרה
									</button>
								</form>
							</div>
						</div>

						{#if editingId === o.id}
							<form
								method="POST"
								action="?/update"
								use:enhance={() => async ({ result, update }) => {
									// סוגרים את העריכה רק בהצלחה — בכישלון הערכים שהוקלדו נשארים
									if (result.type === 'success') editingId = null;
									await update();
								}}
								class="flex flex-wrap gap-2 items-center mt-3 pt-3 border-t border-white/10"
							>
								<input type="hidden" name="id" value={o.id} />
								<input name="name" bind:value={editName} required placeholder="שם מלא *" class="{inputCls} flex-1 min-w-[140px]" />
								<input name="position" bind:value={editPosition} list={'positions-' + o.group} placeholder="תפקיד" class="{inputCls} w-40" />
								<input name="org" bind:value={editOrg} placeholder={groupByKey(o.group)?.orgLabel ?? 'ארגון'} class="{inputCls} w-40" />
								<input name="bio" bind:value={editBio} placeholder="רקע קצר" class="{inputCls} flex-1 min-w-[160px]" />
								<input name="image" type="url" dir="ltr" bind:value={editImage} placeholder="קישור לתמונה (URL)" class="{inputCls} flex-1 min-w-[180px]" />
								<input
									name="official_user"
									dir="ltr"
									placeholder="חשבון הדמות למענה רשמי (user id) · ריק=ללא שינוי · &quot;-&quot;=ניתוק"
									title="מזהה המשתמש של הדמות עצמה — תגובותיה בדף יסומנו כמענה רשמי"
									class="{inputCls} flex-1 min-w-[240px]"
								/>

								<!-- פרופיל מלא: אימות, קשר, שקיפות, התמחויות, הבטחות, נוכחות -->
								<div class="w-full border-t border-white/10 pt-3 mt-1">
									<p class="text-xs font-bold text-gray-400 mb-2">🪪 תעודת זהות ציבורית</p>
									<div class="flex flex-wrap gap-2 items-center">
										<label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer whitespace-nowrap">
											<input type="checkbox" name="verified" bind:checked={editVerified} class="accent-sky-500" />
											✔️ פרופיל מאומת
										</label>
										<input
											name="attendance_score"
											bind:value={editAttendance}
											type="number" min="0" max="100" dir="ltr"
											placeholder="נוכחות %"
											title="אחוז נוכחות בדיונים/הצבעות (0-100); ריק = אין נתון"
											class="{inputCls} w-28"
										/>
										<input name="contact_email" bind:value={editEmail} type="email" dir="ltr" placeholder="דוא&quot;ל לשכה" class="{inputCls} flex-1 min-w-[160px]" />
										<input name="contact_phone" bind:value={editPhone} dir="ltr" placeholder="טלפון לשכה" class="{inputCls} w-36" />
										<input name="contact_whatsapp" bind:value={editWhatsapp} dir="ltr" placeholder="וואטסאפ (מספר/קישור)" class="{inputCls} w-44" />
									</div>
									<div class="flex flex-wrap gap-2 items-center mt-2">
										<input name="contact_facebook" bind:value={editFacebook} type="url" dir="ltr" placeholder="פייסבוק (URL)" class="{inputCls} flex-1 min-w-[160px]" />
										<input name="contact_website" bind:value={editWebsite} type="url" dir="ltr" placeholder="אתר רשמי (URL)" class="{inputCls} flex-1 min-w-[160px]" />
										<input name="platform_url" bind:value={editPlatformUrl} type="url" dir="ltr" placeholder="מצע/התחייבויות (URL)" class="{inputCls} flex-1 min-w-[160px]" />
										<input name="annual_report_url" bind:value={editReportUrl} type="url" dir="ltr" placeholder="דין וחשבון שנתי (URL)" class="{inputCls} flex-1 min-w-[160px]" />
									</div>
									<div class="flex flex-wrap gap-2 items-start mt-2">
										<input
											name="specialties"
											bind:value={editSpecialties}
											placeholder="תחומי עיסוק, מופרדים בפסיק (ביטחון, כלכלה, חינוך)"
											class="{inputCls} flex-1 min-w-[220px]"
										/>
										<textarea
											name="promises"
											bind:value={editPromises}
											rows="3"
											placeholder={'הבטחה בכל שורה. סטטוס אחרי קו אנכי: הבטחה | קוימה\nאו: | בתהליך · | הופרה · בלי קו = טרם נבחנה'}
											class="{inputCls} flex-1 min-w-[260px] leading-relaxed"
										></textarea>
									</div>
								</div>

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
						{searchQuery ? 'לא נמצאו מדורגים לחיפוש הזה' : 'אין מדורגים עדיין'}
					</div>
				{/each}
			</div>
		</section>
	</div>
</div>

<!-- רשימות תפקידים מוצעים לכל קבוצה (לטופס ההוספה ולעריכה) -->
{#each GROUPS as g (g.key)}
	<datalist id={'positions-' + g.key}>
		{#each g.positions as p (p)}
			<option value={p}></option>
		{/each}
	</datalist>
{/each}
