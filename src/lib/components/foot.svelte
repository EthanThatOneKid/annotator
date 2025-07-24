<footer class="footer">
	<div class="footer-container">
		<span class="footer-brand">Annotator</span>
		<span class="footer-copyright">
			&copy; {new Date().getFullYear()}
			<a class="footer-link" href="https://fartlabs.org/">FartLabs.org</a>
		</span>
		<a
			href="https://github.com/EthanThatOneKid/annotator"
			target="_blank"
			rel="noopener"
			class="footer-link source-code-link">Source Code</a
		>
	</div>
</footer>

<style>
	.footer {
		margin-top: 3rem;
		width: 100%;
		background-color: #14532d;
		padding: 2rem 0;
		color: #e5e7eb;
	}

	.footer-container {
		margin: 0 auto;
		max-width: 80rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0 1rem;
	}

	@media (min-width: 768px) {
		.footer-container {
			flex-direction: row;
		}
	}

	.footer-brand {
		font-size: 1.25rem;
		font-weight: 700;
		letter-spacing: 0.05em;
	}

	.footer-copyright {
		font-size: 0.875rem;
	}

	.footer-link {
		color: #6ee7b7;
	}

	.footer-link:hover {
		text-decoration: underline;
	}

	.source-code-link {
		color: #34d399;
	}
</style>
