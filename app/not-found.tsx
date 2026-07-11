import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-5 py-12 sm:px-8">
      <p className="text-sm font-semibold text-blue-700">FLOW</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-950">이 Flow는 지금 열 수 없어요</h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
        주소가 바뀌었거나, 최신 내용 확인을 위해 공개가 중단된 Flow일 수 있습니다.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/flows"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          다른 Flow 찾기
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          홈으로
        </Link>
      </div>
    </main>
  );
}
