import { SearchForm } from "./components/SearchForm"
import { SearchResults } from "./components/SearchResults"

export default function Home() {
    return (
        <main className="search-page">
            <div className="search-page-bg" aria-hidden />
            <div className="search-page-overlay" aria-hidden />
            <div className="search-page-content">
                <div className="search-page-strip">
                    <SearchForm />
                </div>
                <SearchResults />
            </div>
        </main>
    )
}
