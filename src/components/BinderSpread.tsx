import type { BinderPage as BinderPageType } from '../types/PokemonCards'
import BinderPage from './BinderPage'

interface BinderSpreadProps {
  leftPage?: BinderPageType
  rightPage?: BinderPageType
}

function BinderSpread({
  leftPage,
  rightPage,
}: BinderSpreadProps) {
  return (
    <div className="binder-spread">
      <div className="binder-spread-side binder-spread-left">
        {leftPage ? (
          <BinderPage page={leftPage} />
        ) : (
          <div className="binder-inside-cover">
            <p>Pokémon Binder</p>
          </div>
        )}
      </div>

      <div className="binder-spine" />

      <div className="binder-spread-side binder-spread-right">
        {rightPage ? (
          <BinderPage page={rightPage} />
        ) : (
          <div className="binder-empty-side" />
        )}
      </div>
    </div>
  )
}

export default BinderSpread