<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	let personFile: File | null = null;
	let personPreview: string | null = null;

	let items: any = [{ id: Date.now(), file: null, preview: null }];

	let isLoading: boolean = false;
	let resultImageUrl: string | null = null;

	$: allFilesReady =
		personFile && items.length > 0 && items.every((item: any) => item.file !== null);

	function handlePersonFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files ? target.files[0] : null;

		if (personPreview) {
			URL.revokeObjectURL(personPreview);
		}

		personFile = file;
		personPreview = file ? URL.createObjectURL(file) : null;
	}

	function handleItemFileChange(event: Event, id: number) {
		const target = event.target as HTMLInputElement;
		const file = target.files ? target.files[0] : null;

		items = items.map((item: any) => {
			if (item.id === id) {
				if (item.preview) URL.revokeObjectURL(item.preview);
				const preview = file ? URL.createObjectURL(file) : null;
				return { ...item, file, preview };
			}
			return item;
		});
	}

	function addItem() {
		items = [...items, { id: Date.now(), file: null, preview: null }];
	}

	function removeItem(id: number) {
		if (items.length > 1) {
			items = items.filter((item: any) => {
				if (item.id === id && item.preview) {
					URL.revokeObjectURL(item.preview); // 제거 시 프리뷰 해제
				}
				return item.id !== id;
			});
		} else {
			if (items[0].preview) URL.revokeObjectURL(items[0].preview);
			items = [{ id: Date.now(), file: null, preview: null }];
		}
	}

	async function handleSubmit() {
		if (!allFilesReady) return;
		isLoading = true;
		resultImageUrl = null;

		const formData = new FormData();
		formData.append('person', personFile!);

		items.forEach((item: any) => {
			formData.append('items', item.file);
		});

		try {
			const response = await fetch('/api/synthesize', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				throw new Error(await response.text());
			}

			const imageBlob = await response.blob();

			if (resultImageUrl) URL.revokeObjectURL(resultImageUrl);
			resultImageUrl = URL.createObjectURL(imageBlob);
		} catch (error) {
			alert('이미지 합성에 실패했습니다: ' + (error as Error).message);
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-100 p-4 pb-16 md:p-8">
	<div class="max-w-7xl mx-auto">
		<header class="text-center mb-10">
			<h1 class="text-4xl md:text-5xl font-extrabold text-gray-900">
				Nano<span class="text-blue-600">Styler</span>
			</h1>
			<p class="text-lg text-gray-600 mt-2">AI로 나만의 스타일을 합성해 보세요.</p>
		</header>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 md:items-start">
			<div class="bg-white rounded-xl shadow-lg p-6">
				<h2 class="text-2xl font-bold text-gray-800 mb-4">1. 인물 사진</h2>
				<label for="person-upload" class="cursor-pointer">
					<div
						class="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:border-blue-500 transition-colors"
					>
						{#if personPreview}
							<img
								src={personPreview}
								alt="인물 미리보기"
								class="max-h-60 mx-auto rounded-md"
								in:fly={{ y: 20, duration: 300 }}
							/>
						{:else}
							<span class="text-gray-500">클릭 또는 드래그 앤 드롭</span>
						{/if}
					</div>
				</label>
				<input
					id="person-upload"
					type="file"
					class="hidden"
					accept="image/*"
					on:change={handlePersonFileChange}
				/>
			</div>

			<div class="bg-white rounded-xl shadow-lg p-6">
				<h2 class="text-2xl font-bold text-gray-800 mb-4">2. 아이템 (옷, 액세서리)</h2>

				<div class="space-y-4 max-h-[60vh] pr-2 overflow-y-auto pt-3">
					{#each items as item (item.id)}
						<div
							in:fly={{ y: -20, duration: 300, easing: quintOut }}
							class="relative border-gray-200 rounded-lg"
						>
							{#if items.length > 1}
								<button
									on:click={() => removeItem(item.id)}
									class="absolute z-999 -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold hover:bg-red-700 transition-all"
								>
									&times;
								</button>
							{/if}

							<label for="item-upload-{item.id}" class="cursor-pointer">
								<div
									class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors"
								>
									{#if item.preview}
										<img
											src={item.preview}
											alt="아이템 미리보기"
											class="max-h-40 mx-auto rounded-md"
											in:fly={{ y: 20, duration: 300 }}
										/>
									{:else}
										<span class="text-gray-500">아이템 이미지 (옷, 모자 등)</span>
									{/if}
								</div>
							</label>
							<input
								id="item-upload-{item.id}"
								type="file"
								class="hidden"
								accept="image/*"
								on:change={(e) => handleItemFileChange(e, item.id)}
							/>
						</div>
					{/each}
				</div>

				<button
					on:click={addItem}
					class="mt-6 w-full bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
				>
					+ 아이템 추가하기
				</button>
			</div>

			<div class="bg-white rounded-xl shadow-lg p-6">
				<h2 class="text-2xl font-bold text-gray-800 mb-4">3. 결과 확인</h2>

				<button
					on:click={handleSubmit}
					disabled={!allFilesReady || isLoading}
					class="w-full text-white font-bold py-3 px-4 rounded-lg transition-all
								 {allFilesReady && !isLoading ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}
								 flex items-center justify-center"
				>
					{#if isLoading}
						<svg
							class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
							xmlns="http://www.w.3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						합성 중...
					{:else}
						스타일 합성하기
					{/if}
				</button>

				<div class="mt-6 border-t pt-6">
					{#if isLoading}
						<div class="text-center text-gray-600">
							<p>AI가 이미지를 분석하고 있습니다.</p>
							<p>잠시만 기다려주세요...</p>
						</div>
					{:else if resultImageUrl}
						<div in:fade={{ duration: 500 }}>
							<h3 class="text-xl font-semibold mb-3">합성 완료!</h3>
							<img src={resultImageUrl} alt="합성 결과" class="w-full rounded-md shadow-md" />
							<a
								href={resultImageUrl}
								download="stylekit_result.png"
								class="mt-4 w-full block text-center bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700"
							>
								이미지 저장
							</a>
						</div>
					{:else}
						<div class="text-center text-gray-500">
							<p>인물 사진과 1개 이상의</p>
							<p>아이템을 모두 업로드해 주세요.</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
