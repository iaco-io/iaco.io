<script>
	import { Waves, Feather, Sprout } from '@lucide/svelte';

	const topics = [
		{ icon: Sprout, title: 'wellness', text: 'small habits that make days lighter.' },
		{ icon: Waves, title: 'digital calm', text: 'using technology without being used by it.' },
		{ icon: Feather, title: 'notes', text: 'short reflections, written slowly.' }
	];
</script>

<svelte:head>
	<title>iaco — blog</title>
</svelte:head>

<main>
	<section class="hero">
		<p class="eyebrow">the iaco blog</p>
		<h1>calm ideas,<br />one wave at a time.</h1>
		<p class="lead">writing on wellness, habits and a gentler digital life.</p>
	</section>

	<section id="latest" class="topics">
		{#each topics as { icon: Icon, title, text }}
			<article class="card glass">
				<Icon size={22} strokeWidth={1.75} />
				<h2>{title}</h2>
				<p>{text}</p>
			</article>
		{/each}
	</section>

	<section id="about" class="about">
		<h2>first posts are on their way.</h2>
		<p>install this site as an app to read offline.</p>
	</section>
</main>

<style>
	main {
		max-width: 64rem;
		margin: 0 auto;
		padding: calc(var(--top) + 9rem) 1.5rem 8rem;
	}

	.hero {
		text-align: center;
		padding-bottom: 6rem;
	}

	.eyebrow {
		margin: 0 0 1rem;
		font-size: 1rem;
		font-weight: 600;
		color: var(--soft);
	}

	h1 {
		margin: 0;
		font-size: clamp(2.75rem, 8vw, 5.5rem);
		line-height: 1.04;
		font-weight: 700;
		letter-spacing: -0.045em;
		background: linear-gradient(180deg, var(--fg), var(--accent));
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}

	.lead {
		max-width: 30rem;
		margin: 1.5rem auto 0;
		font-size: clamp(1.15rem, 2.4vw, 1.4rem);
		line-height: 1.45;
		color: var(--muted);
	}

	.topics {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		gap: 1rem;
		scroll-margin-top: calc(var(--top) + 6rem);
	}

	.card {
		padding: 1.75rem;
		border-radius: 1.5rem;
		color: var(--accent);
	}

	.card h2 {
		margin: 1rem 0 0.35rem;
		font-size: 1.25rem;
		letter-spacing: -0.02em;
		color: var(--fg);
	}

	.card p {
		margin: 0;
		line-height: 1.5;
		color: var(--muted);
	}

	.about {
		margin-top: 6rem;
		text-align: center;
		scroll-margin-top: calc(var(--top) + 6rem);
	}

	.about h2 {
		margin: 0;
		font-size: clamp(1.6rem, 4vw, 2.4rem);
		letter-spacing: -0.03em;
	}

	.about p {
		margin: 0.75rem 0 0;
		color: var(--muted);
	}
</style>
