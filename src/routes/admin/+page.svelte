<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';

	let { data, form } = $props();

	let activeTab = $state<'users' | 'items'>('users');
	let searchQuery = $state('');
	let roleFilter = $state<'all' | 'user' | 'neighborhood_admin' | 'super_admin'>('all');

	// מינוי אדמין - מודל
	let showRoleModal = $state(false);
	let roleModalUser = $state<{ id: string; name: string | null; role: string; neighborhood: string } | null>(null);
	let newRole = $state('user');
	let newNeighborhood = $state('');

	function openRoleModal(user: typeof roleModalUser) {
		roleModalUser = user;
		newRole = user?.role ?? 'user';
		newNeighborhood = user?.neighborhood ?? '';
		showRoleModal = true;
	}

	// סינון משתמשים
	const filteredUsers = $derived(() => {
		let list = data.users ?? [];
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			list = list.filter(u =>
				(u.name?.toLowerCase().includes(q)) ||
				(u.email?.toLowerCase().includes(q)) ||
				(u.id?.toLowerCase().includes(q)) ||
				(u.neighborhood?.toLowerCase().includes(q))
			);
		}
		if (roleFilter !== 'all') {
			list = list.filter(u => u.role === roleFilter);
		}
		return list;
	});

	// סינון פריטים
	const filteredItems = $derived(() => {
		if (!searchQuery) return data.items ?? [];
		const q = searchQuery.toLowerCase();
		return (data.items ?? []).filter(i =>
			i.label?.toLowerCase().includes(q) ||
			i.description?.toLowerCase().includes(q) ||
			i.category?.toLowerCase().includes(q)
		);
	});

	function roleBadge(role: string) {
		switch (role) {
			case 'super_admin': return { text: 'מנהל ראשי', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
			case 'neighborhood_admin': return { text: 'אדמין שכונתי', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
			default: return { text: 'משתמש', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
		}
	}
</script>

<svelte:head>
	<title>ניהול האתר</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] text-white" dir="rtl">
	<div class="max-w-6xl mx-auto px-4 py-8">

		<!-- כותרת -->
		<div class="flex items-center justify-between mb-8">
			<div>
				<h1 class="text-3xl font-black">
					לוח ניהול
				</h1>
				<p class="text-gray-400 mt-1">ניהול משתמשים, תוכן והרשאות</p>
			</div>
			<div class="flex gap-2 flex-wrap">
				<a
					href="/admin/officials"
					class="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all"
				>
					🗳️ ניהול מדורגים
				</a>
				<a
					href="/admin/reports"
					class="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all"
				>
					🚩 דיווחי תוכן
				</a>
				<button
					onclick={() => goto('/')}
					class="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
				>
					חזרה לאתר
				</button>
			</div>
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

		<!-- טאבים -->
		<div class="flex gap-2 mb-6">
			<button
				onclick={() => (activeTab = 'users')}
				class="px-5 py-2.5 rounded-xl font-bold transition-all cursor-pointer {activeTab === 'users'
					? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
					: 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}"
			>
				👥 משתמשים ({data.users?.length ?? 0})
			</button>
			<button
				onclick={() => (activeTab = 'items')}
				class="px-5 py-2.5 rounded-xl font-bold transition-all cursor-pointer {activeTab === 'items'
					? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
					: 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}"
			>
				📋 פרסומים ({data.items?.length ?? 0})
			</button>
		</div>

		<!-- חיפוש -->
		<div class="mb-6 flex gap-3 flex-wrap">
			<input
				type="text"
				placeholder="חיפוש..."
				bind:value={searchQuery}
				class="flex-1 min-w-[200px] bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white
				       placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
			/>
			{#if activeTab === 'users'}
				<select
					bind:value={roleFilter}
					class="bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white cursor-pointer
					       focus:outline-none focus:border-purple-500 transition-colors"
				>
					<option value="all">כל התפקידים</option>
					<option value="user">משתמשים</option>
					<option value="neighborhood_admin">אדמינים שכונתיים</option>
					<option value="super_admin">מנהלים ראשיים</option>
				</select>
			{/if}
		</div>

		<!-- טאב משתמשים -->
		{#if activeTab === 'users'}
			<div class="space-y-3">
				{#each filteredUsers() as user (user.id)}
					{@const badge = roleBadge(user.role)}
					<div class="bg-[#0f172a] rounded-2xl border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all hover:border-white/20">
						<!-- אווטאר + שם -->
						<div class="flex items-center gap-3 flex-1 min-w-0">
							{#if user.avatar_url}
								<img src={user.avatar_url} alt="" class="w-10 h-10 rounded-full object-cover flex-shrink-0" />
							{:else}
								<div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0 text-sm font-bold">
									{(user.name ?? '?')[0]}
								</div>
							{/if}
							<div class="min-w-0">
								<div class="font-bold truncate flex items-center gap-2">
									{user.name ?? 'ללא שם'}
									{#if user.banned}
										<span class="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">חסום</span>
									{/if}
								</div>
								<div class="text-sm text-gray-400 truncate">{user.email ?? '-'}</div>
							</div>
						</div>

						<!-- שכונה -->
						<div class="text-sm text-gray-400 min-w-[100px]">
							{user.neighborhood || '-'}
						</div>

						<!-- תפקיד -->
						<span class="text-xs font-bold border px-2.5 py-1 rounded-full whitespace-nowrap {badge.color}">
							{badge.text}
						</span>

						<!-- פעולות -->
						<div class="flex gap-2 flex-shrink-0">
							<!-- שינוי תפקיד -->
							<button
								onclick={() => openRoleModal({ id: user.id, name: user.name, role: user.role, neighborhood: user.neighborhood })}
								class="px-3 py-1.5 text-xs rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30
								       hover:bg-purple-500/20 transition-all cursor-pointer"
								title="שנה תפקיד"
							>
								🛡️ תפקיד
							</button>

							<!-- חסימה/ביטול חסימה -->
							{#if user.id !== data.currentUserId}
								{#if user.banned}
									<form method="POST" action="?/unban" use:enhance>
										<input type="hidden" name="userId" value={user.id} />
										<button
											type="submit"
											class="px-3 py-1.5 text-xs rounded-lg bg-green-500/10 text-green-400 border border-green-500/30
											       hover:bg-green-500/20 transition-all cursor-pointer"
										>
											✅ בטל חסימה
										</button>
									</form>
								{:else}
									<form method="POST" action="?/ban" use:enhance>
										<input type="hidden" name="userId" value={user.id} />
										<button
											type="submit"
											class="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/30
											       hover:bg-red-500/20 transition-all cursor-pointer"
											onclick={(e) => { if (!confirm(`לחסום את ${user.name ?? user.id}?`)) e.preventDefault(); }}
										>
											🚫 חסום
										</button>
									</form>
								{/if}
							{/if}
						</div>
					</div>
				{:else}
					<div class="text-center text-gray-500 py-12">
						{searchQuery ? 'לא נמצאו משתמשים' : 'אין משתמשים עדיין'}
					</div>
				{/each}
			</div>
		{/if}

		<!-- טאב פרסומים -->
		{#if activeTab === 'items'}
			<div class="space-y-3">
				{#each filteredItems() as item (item.id)}
					<div class="bg-[#0f172a] rounded-2xl border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all hover:border-white/20">
						<!-- אייקון + שם -->
						<div class="flex items-center gap-3 flex-1 min-w-0">
							<span class="text-2xl flex-shrink-0">{item.icon || '📦'}</span>
							<div class="min-w-0">
								<div class="font-bold truncate">{item.label}</div>
								<div class="text-sm text-gray-400 truncate">{item.description?.slice(0, 80)}</div>
							</div>
						</div>

						<!-- קטגוריה -->
						<span class="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-full whitespace-nowrap">
							{item.category}
						</span>

						<!-- שכונה -->
						<div class="text-sm text-gray-400 min-w-[80px]">
							{item.neighborhood || '-'}
						</div>

						<!-- מחיקה -->
						<form method="POST" action="?/deleteItem" use:enhance>
							<input type="hidden" name="itemId" value={item.id} />
							<button
								type="submit"
								class="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/30
								       hover:bg-red-500/20 transition-all cursor-pointer"
								onclick={(e) => { if (!confirm(`למחוק "${item.label}"?`)) e.preventDefault(); }}
							>
								🗑️ מחק
							</button>
						</form>
					</div>
				{:else}
					<div class="text-center text-gray-500 py-12">
						{searchQuery ? 'לא נמצאו פרסומים' : 'אין פרסומים עדיין'}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- מודל שינוי תפקיד -->
{#if showRoleModal && roleModalUser}
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
		onclick={() => (showRoleModal = false)}
		role="presentation"
	>
		<div
			class="bg-[#0f172a] rounded-2xl border border-white/10 shadow-2xl w-full max-w-md p-6"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
		>
			<h2 class="text-xl font-bold mb-4">🛡️ שינוי תפקיד</h2>
			<p class="text-gray-400 mb-4">
				משתמש: <span class="text-white font-bold">{roleModalUser.name ?? roleModalUser.id}</span>
			</p>

			<form method="POST" action="?/setRole" use:enhance={() => {
				return async ({ result, update }) => {
					showRoleModal = false;
					await update();
				};
			}}>
				<input type="hidden" name="userId" value={roleModalUser.id} />

				<label class="block text-sm font-medium text-gray-400 mb-2">תפקיד</label>
				<select
					name="role"
					bind:value={newRole}
					class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white mb-4
					       focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
				>
					<option value="user">משתמש רגיל</option>
					<option value="neighborhood_admin">אדמין שכונתי</option>
					<option value="super_admin">מנהל ראשי</option>
				</select>

				{#if newRole === 'neighborhood_admin'}
					<label class="block text-sm font-medium text-gray-400 mb-2">שכונה</label>
					<input
						name="neighborhood"
						type="text"
						bind:value={newNeighborhood}
						placeholder="שם השכונה..."
						class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white mb-4
						       placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
					/>
				{/if}

				<div class="flex gap-3 mt-4">
					<button
						type="submit"
						class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold
						       hover:from-blue-500 hover:to-purple-500 transition-all cursor-pointer"
					>
						שמור
					</button>
					<button
						type="button"
						onclick={() => (showRoleModal = false)}
						class="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300
						       hover:bg-white/10 transition-all cursor-pointer"
					>
						ביטול
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
