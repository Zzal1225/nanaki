import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createPhotoUrls,
  deletePhoto,
  findLatestPhoto,
  listPhotosOfRecord,
  PHOTO_URL_EXPIRES_SECONDS,
  uploadPhoto,
  type LatestPhotoBasis,
  type Photo,
  type PhotoKind,
} from '../api/photoStore';

// 사진 조회·올리기·지우기 훅 (step4). 사진은 온라인 전용이라 기록 키(records)가 아니라 따로 둔다:
// 기록을 쓰거나 지울 때마다 사진을 다시 받을 이유가 없다
export const photoKeys = {
  all: ['photos'] as const,
  ofRecord: (recordId: string) =>
    [...photoKeys.all, 'record', recordId] as const,
  latest: (kind: PhotoKind, basis: LatestPhotoBasis) =>
    [
      ...photoKeys.all,
      'latest',
      kind,
      basis.recordId ?? null,
      basis.date,
    ] as const,
  urls: (paths: readonly string[]) =>
    [...photoKeys.all, 'urls', ...paths] as const,
};

// 서명 링크를 이만큼만 다시 쓴다: 링크가 닫히기(10분) 전에 새로 받는다
const URL_STALE_MS = (PHOTO_URL_EXPIRES_SECONDS - 2 * 60) * 1000;

// isEnabled: 오프라인이거나 아직 서버에 없는 기록(대기열)이면 묻지 않는다
export function useRecordPhotos(recordId: string, isEnabled: boolean) {
  return useQuery({
    queryKey: photoKeys.ofRecord(recordId),
    queryFn: isEnabled ? () => listPhotosOfRecord(recordId) : skipToken,
  });
}

// 같은 자세의 지난 사진 (맞춰 자르기·카메라의 겹치기). isEnabled: 창이 열려 있고 온라인일 때만
export function useLatestPhoto(
  kind: PhotoKind,
  basis: LatestPhotoBasis,
  isEnabled: boolean,
) {
  return useQuery({
    queryKey: photoKeys.latest(kind, basis),
    queryFn: isEnabled ? () => findLatestPhoto(kind, basis) : skipToken,
  });
}

// 경로들의 서명 링크 (한 번에). 경로가 없으면 묻지 않는다
export function usePhotoUrls(paths: readonly string[]) {
  return useQuery({
    queryKey: photoKeys.urls(paths),
    queryFn: paths.length > 0 ? () => createPhotoUrls(paths) : skipToken,
    staleTime: URL_STALE_MS,
    refetchInterval: URL_STALE_MS,
  });
}

// 올리기. 바꾸기(같은 종류가 이미 있음)는 새 사진을 올린 뒤 옛 사진을 지운다: 올리기가 실패하면 옛 사진이 그대로 남게
export function useUploadPhoto(recordId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      kind: PhotoKind;
      file: File;
      replacing?: Photo;
    }) => {
      const photo = await uploadPhoto({
        recordId,
        kind: input.kind,
        file: input.file,
      });
      if (input.replacing) await deletePhoto(input.replacing);
      return photo;
    },
    // 기록의 사진만이 아니라 photos 전체: 방금 올린 사진이 다음 자르기의 "지난 사진"이 된다
    onSettled: () => queryClient.invalidateQueries({ queryKey: photoKeys.all }),
  });
}

export function useDeletePhoto(recordId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePhoto,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: photoKeys.ofRecord(recordId) }),
  });
}
