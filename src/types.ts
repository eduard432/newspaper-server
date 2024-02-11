export type NewsPapersList =
	| 'milenio'
	| 'el_universal'
	| 'la_jornada'
	| 'el_mundo'
	| 'el_financiero'
	| 'el_economista'
	| 'el_sol_de_mexico'
	| 'excelsior'
	| 'diario_de_yucatan'
	| 'la_razon'
	| 'el_heraldo'
	| 'vanguardia'
	| 'el_informador'
	| 'wsj'
	| 'the_washington_post'
	| 'the_guardian'
	| 'abc'
	| 'el_pais'

export type NewsPapersMap = { [NEWSPAPER in NewsPapersList]: NewsPaperData }

export type NewsPaperData = {
	urlCode: string
	maxWidth?: number
}
