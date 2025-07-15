'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
	const [isDark, setIsDark] = useState(false)

	useEffect(() => {
		const saved = localStorage.getItem('theme')
		if (saved === 'dark') {
			document.documentElement.classList.add('dark')
			setIsDark(true)
		}
	}, [])

	const toggle = () => {
		const html = document.documentElement
		if (html.classList.contains('dark')) {
			html.classList.remove('dark')
			localStorage.setItem('theme', 'light')
			setIsDark(false)
		} else {
			html.classList.add('dark')
			localStorage.setItem('theme', 'dark')
			setIsDark(true)
		}
	}

	return (
		<button
			onClick={toggle}
			className="fixed top-40 right-4 p-2 rounded-md bg-gray-200 dark:bg-gray-700"
		>
			{isDark ? '🌞' : '🌙'}
		</button>
	)
}
