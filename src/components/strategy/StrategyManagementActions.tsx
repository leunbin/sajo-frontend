import axios from 'axios';
import { LoaderCircle, MoreHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { deleteStrategy } from '../../api/strategy';
import type { StrategyDetail } from '../../types/strategy';

import './StrategyManagementActions.scss';

interface StrategyManagementActionsProps {
  strategy: StrategyDetail;
}

function StrategyManagementActions({ strategy }: StrategyManagementActionsProps) {
  const navigate = useNavigate();

  const menuRef = useRef<HTMLDivElement>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const isActive = strategy.status === 'ACTIVE';

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isDeleteModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) {
        setIsDeleteModalOpen(false);
        setDeleteError('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDeleteModalOpen, isDeleting]);

  const handleEdit = () => {
    if (isActive) {
      return;
    }

    navigate(`/strategies/${strategy.strategyId}/edit`);
  };

  const handleDeleteRequest = () => {
    if (isActive) {
      return;
    }

    setIsMenuOpen(false);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (isDeleting || isActive) {
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError('');

      await deleteStrategy(strategy.strategyId);

      navigate('/strategies', {
        replace: true,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setDeleteError(error.response?.data?.message ?? '전략을 삭제하지 못했습니다.');
      } else {
        setDeleteError('전략을 삭제하지 못했습니다.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="strategy-management">
        <div className="strategy-management__actions">
          <button
            type="button"
            className="strategy-management__edit"
            disabled={isActive}
            onClick={handleEdit}
          >
            전략 수정
          </button>

          <div ref={menuRef} className="strategy-management__menu-wrap">
            <button
              type="button"
              className="strategy-management__menu-button"
              aria-label="전략 관리 메뉴"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              disabled={isActive}
              onClick={() => setIsMenuOpen((previous) => !previous)}
            >
              <MoreHorizontal size={19} />
            </button>

            {isMenuOpen && !isActive && (
              <div className="strategy-management__menu" role="menu">
                <button type="button" role="menuitem" onClick={handleDeleteRequest}>
                  전략 삭제
                </button>
              </div>
            )}
          </div>
        </div>

        {isActive && (
          <p className="strategy-management__notice">
            운용 중인 전략은 비활성화 후 수정하거나 삭제할 수 있습니다.
          </p>
        )}
      </div>

      {isDeleteModalOpen && (
        <div
          className="strategy-management__overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isDeleting) {
              setIsDeleteModalOpen(false);
              setDeleteError('');
            }
          }}
        >
          <div
            className="strategy-management__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="strategy-delete-title"
          >
            <h2 id="strategy-delete-title">전략을 삭제하시겠어요?</h2>

            <p>
              <strong>{strategy.strategyName}</strong> 전략을 삭제합니다.
              <br />
              삭제한 전략은 다시 사용할 수 없습니다.
            </p>

            {deleteError && (
              <div className="strategy-management__error" role="alert">
                {deleteError}
              </div>
            )}

            <div className="strategy-management__modal-actions">
              <button
                type="button"
                className="strategy-management__modal-cancel"
                disabled={isDeleting}
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteError('');
                }}
              >
                취소
              </button>

              <button
                type="button"
                className="strategy-management__modal-delete"
                disabled={isDeleting}
                onClick={() => void handleDelete()}
              >
                {isDeleting ? (
                  <>
                    <LoaderCircle className="strategy-management__spinner" size={16} />
                    삭제 중
                  </>
                ) : (
                  '삭제'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default StrategyManagementActions;
